"use server";
import { randomBytes, createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { DENIED, authorizeAction, hasCampus } from "@/lib/tenant/authorizeAction";
import { PERMISSIONS as P, ROLE_DEFINITIONS } from "@/lib/permissions";
import { grantableRoles, scopeKind } from "@/lib/permissions/grant";
import { parseNested } from "@/lib/validations/students";
import { INVITE_TTL_DAYS, inviteSchema, memberUpdateSchema } from "@/lib/validations/team";
import { auditInTx } from "@/lib/audit/tenantAudit";

const base = (ctx) => `tenants/${ctx.tenantId}`;
const ts = () => FieldValue.serverTimestamp();
const refresh = (slug) => revalidatePath(`/${slug}/dashboard/settings/team`);
const auth = (slug) => authorizeAction(slug, { permission: P.SETTINGS_MANAGE });

class UserError extends Error {}
const fail = (m) => { throw new UserError(m); };
const result = (e, fallback) => (e instanceof UserError ? { ok: false, error: e.message } : { ok: false, error: fallback });

export const hashToken = (t) => createHash("sha256").update(t).digest("hex");

/** Shared role/campus/employee consistency checks. Returns the campusIds to store. */
async function validateAccess(tx, ctx, { role, campusIds, employeeId, ignoreEmployeeLink }) {
  if (!grantableRoles(ctx.permissions, ctx.orgWide).includes(role)) fail("You cannot grant that role.");
  const kind = scopeKind(role);
  let ids = [];
  if (kind !== "ORG") {
    ids = [...new Set(campusIds)];
    if (!ids.length) fail("Select at least one campus for this role.");
    if (!ids.every((id) => hasCampus(ctx, id))) fail("You can only choose campuses you have access to.");
  }
  if (kind === "ASSIGNED" && !employeeId) fail("Teacher roles must be linked to a teaching staff record.");
  if (employeeId) {
    const e = await tx.get(adminDb.doc(`${base(ctx)}/employees/${employeeId}`));
    if (!e.exists || e.data().status !== "ACTIVE") fail("Choose an active staff record.");
    const d = e.data();
    if (!ignoreEmployeeLink && d.linkedUid) fail("That staff record already has a login.");
    if (kind === "ASSIGNED" && d.staffType !== "TEACHING") fail("Teacher roles need a teaching staff record.");
    if (kind === "ASSIGNED" && !ids.includes(d.campusId)) fail("The staff record must belong to one of the selected campuses.");
    if (kind !== "ASSIGNED" && !hasCampus(ctx, d.campusId)) fail("You do not have access to that staff record's campus.");
  }
  return ids;
}

export async function createInvitation(slug, input) {
  const a = await auth(slug);
  if (a.error) return a.error;
  const { ctx } = a;
  const p = parseNested(inviteSchema, input);
  if (p.error) return p.error;
  const { email, role, campusIds, employeeId } = p.data;

  const token = randomBytes(32).toString("base64url"); // shown once; only its hash is stored
  const ref = adminDb.collection(`${base(ctx)}/invitations`).doc();
  try {
    await adminDb.runTransaction(async (tx) => {
      const ids = await validateAccess(tx, ctx, { role, campusIds, employeeId });
      const [member, pending, empPending] = await Promise.all([
        tx.get(adminDb.collection(`${base(ctx)}/members`).where("email", "==", email).limit(1)),
        tx.get(adminDb.collection(`${base(ctx)}/invitations`).where("email", "==", email).where("status", "==", "PENDING").limit(1)),
        employeeId ? tx.get(adminDb.collection(`${base(ctx)}/invitations`).where("employeeId", "==", employeeId).where("status", "==", "PENDING").limit(1)) : null,
      ]);
      if (!member.empty) fail("This person already has access to the workspace.");
      if (!pending.empty) fail("An invitation for this email is already pending. Revoke it first to send a new one.");
      if (empPending && !empPending.empty) fail("That staff record already has a pending invitation.");

      tx.set(ref, {
        tenantId: ctx.tenantId, email, role, campusIds: ids, employeeId: employeeId || null, status: "PENDING",
        tokenHash: hashToken(token), expiresAt: Timestamp.fromMillis(Date.now() + INVITE_TTL_DAYS * 86400000),
        invitedBy: ctx.user.uid, createdAt: ts(),
      });
      auditInTx(tx, ctx.tenantId, { action: "INVITATION_CREATED", actorUid: ctx.user.uid, targetType: "invitation", targetId: ref.id, meta: { role } });
    });
  } catch (e) { return result(e, "Could not create the invitation."); }
  refresh(slug);
  return { ok: true, message: "Invitation created.", path: `/invitation?s=${encodeURIComponent(slug)}&i=${ref.id}&k=${token}` };
}

export async function revokeInvitation(slug, inviteId) {
  const a = await auth(slug);
  if (a.error) return a.error;
  const { ctx } = a;
  const ref = adminDb.doc(`${base(ctx)}/invitations/${inviteId}`);
  try {
    await adminDb.runTransaction(async (tx) => {
      const s = await tx.get(ref);
      if (!s.exists) fail("Invitation not found.");
      const inv = s.data();
      if (inv.status !== "PENDING") fail("This invitation is no longer pending.");
      // The same grant rule applies: you cannot revoke an invitation for a role you could not have granted.
      if (!grantableRoles(ctx.permissions, ctx.orgWide).includes(inv.role)) throw new UserError(DENIED.error);
      tx.update(ref, { status: "REVOKED", revokedBy: ctx.user.uid, revokedAt: ts() });
      auditInTx(tx, ctx.tenantId, { action: "INVITATION_REVOKED", actorUid: ctx.user.uid, targetType: "invitation", targetId: inviteId });
    });
  } catch (e) { return result(e, "Could not revoke the invitation."); }
  refresh(slug);
  return { ok: true, message: "Invitation revoked." };
}

/** Actor must be able to manage the TARGET as well (cannot touch someone more powerful, or outside their campuses). */
function assertCanManageTarget(ctx, uid, target) {
  if (uid === ctx.user.uid) fail("You cannot change your own access.");
  if (!target || target.role === "OWNER") fail("This member's access cannot be changed here.");
  if (!grantableRoles(ctx.permissions, ctx.orgWide).includes(target.role)) fail(DENIED.error);
  if (!ctx.orgWide && !(target.campusIds || []).every((id) => hasCampus(ctx, id))) fail(DENIED.error);
}

export async function updateMember(slug, uid, input) {
  const a = await auth(slug);
  if (a.error) return a.error;
  const { ctx } = a;
  const p = parseNested(memberUpdateSchema, input);
  if (p.error) return p.error;
  const ref = adminDb.doc(`${base(ctx)}/members/${uid}`);
  try {
    await adminDb.runTransaction(async (tx) => {
      const s = await tx.get(ref);
      assertCanManageTarget(ctx, uid, s.exists ? s.data() : null);
      const cur = s.data();
      const ids = await validateAccess(tx, ctx, { role: p.data.role, campusIds: p.data.campusIds, employeeId: cur.employeeId || "", ignoreEmployeeLink: true });
      const changedFields = [];
      if (cur.role !== p.data.role) changedFields.push("role");
      if (JSON.stringify([...(cur.campusIds || [])].sort()) !== JSON.stringify([...ids].sort())) changedFields.push("campusIds");
      if (!changedFields.length) return;
      tx.update(ref, { role: p.data.role, campusIds: ids, updatedBy: ctx.user.uid, updatedAt: ts() });
      auditInTx(tx, ctx.tenantId, { action: "MEMBER_ACCESS_CHANGED", actorUid: ctx.user.uid, targetType: "member", targetId: uid, changedFields, meta: { from: cur.role, to: p.data.role } });
    });
  } catch (e) { return result(e, "Could not update access."); }
  refresh(slug);
  return { ok: true, message: "Access updated." };
}

export async function setMemberStatus(slug, uid, status) {
  const a = await auth(slug);
  if (a.error) return a.error;
  const { ctx } = a;
  if (!["ACTIVE", "INACTIVE"].includes(status)) return { ok: false, error: "Invalid status." };
  const ref = adminDb.doc(`${base(ctx)}/members/${uid}`);
  try {
    await adminDb.runTransaction(async (tx) => {
      const s = await tx.get(ref);
      assertCanManageTarget(ctx, uid, s.exists ? s.data() : null);
      if (s.data().status === status) return;
      // Takes effect on the member's next request: every request re-reads the membership.
      tx.update(ref, { status, updatedBy: ctx.user.uid, updatedAt: ts() });
      auditInTx(tx, ctx.tenantId, { action: status === "ACTIVE" ? "MEMBER_REACTIVATED" : "MEMBER_SUSPENDED", actorUid: ctx.user.uid, targetType: "member", targetId: uid, changedFields: ["status"] });
    });
  } catch (e) { return result(e, "Could not change the status."); }
  refresh(slug);
  return { ok: true, message: status === "ACTIVE" ? "Access restored." : "Access suspended." };
}
