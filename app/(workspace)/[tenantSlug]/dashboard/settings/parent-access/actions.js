"use server";
import { randomBytes, createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { DENIED, authorizeAction, hasCampus } from "@/lib/tenant/authorizeAction";
import { PERMISSIONS as P } from "@/lib/permissions";
import { parseNested } from "@/lib/validations/students";
import { INVITE_TTL_DAYS } from "@/lib/validations/team";
import { auditInTx } from "@/lib/audit/tenantAudit";
import { z } from "zod";

const base = (ctx) => `tenants/${ctx.tenantId}`;
const ts = () => FieldValue.serverTimestamp();
const refresh = (slug) => revalidatePath(`/${slug}/dashboard/settings/parent-access`);
const auth = (slug) => authorizeAction(slug, { permission: [P.STUDENTS_UPDATE, P.SETTINGS_MANAGE] });

class UserError extends Error {}
const fail = (m) => { throw new UserError(m); };
const result = (e, fallback) => (e instanceof UserError ? { ok: false, error: e.message } : e.message === "DENIED" ? DENIED : { ok: false, error: fallback });

const inviteSchema = z.object({
  studentId: z.string().min(1).max(40),
  guardianId: z.string().min(1).max(40),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(120),
});

/** The actor must be able to access EVERY campus where this guardian has a linked child. */
async function assertGuardianCampuses(tx, ctx, guardianId) {
  const links = await tx.get(adminDb.collection(`${base(ctx)}/studentGuardians`).where("guardianId", "==", guardianId));
  if (links.empty) fail("This guardian has no linked students.");
  const studs = await Promise.all(links.docs.map((l) => tx.get(adminDb.doc(`${base(ctx)}/students/${l.data().studentId}`))));
  if (!studs.every((s) => s.exists && hasCampus(ctx, s.data().campusId))) throw new Error("DENIED");
  return links;
}

export async function inviteGuardian(slug, input) {
  const a = await auth(slug);
  if (a.error) return a.error;
  const { ctx } = a;
  const p = parseNested(inviteSchema, input);
  if (p.error) return p.error;
  const { studentId, guardianId, email } = p.data;

  const token = randomBytes(32).toString("base64url"); // shown once; only the hash is stored
  const ref = adminDb.collection(`${base(ctx)}/invitations`).doc();
  try {
    await adminDb.runTransaction(async (tx) => {
      const [student, guardian, link] = await Promise.all([
        tx.get(adminDb.doc(`${base(ctx)}/students/${studentId}`)),
        tx.get(adminDb.doc(`${base(ctx)}/guardians/${guardianId}`)),
        tx.get(adminDb.collection(`${base(ctx)}/studentGuardians`).where("studentId", "==", studentId).where("guardianId", "==", guardianId).limit(1)),
      ]);
      if (!student.exists || link.empty || !guardian.exists) fail("That guardian is not linked to this student.");
      if (!hasCampus(ctx, student.data().campusId)) throw new Error("DENIED");
      await assertGuardianCampuses(tx, ctx, guardianId);
      if (guardian.data().linkedUid) fail("This guardian already has a portal login.");

      const [member, pendingEmail, pendingG] = await Promise.all([
        tx.get(adminDb.collection(`${base(ctx)}/members`).where("email", "==", email).limit(1)),
        tx.get(adminDb.collection(`${base(ctx)}/invitations`).where("email", "==", email).where("status", "==", "PENDING").limit(1)),
        tx.get(adminDb.collection(`${base(ctx)}/invitations`).where("guardianId", "==", guardianId).where("status", "==", "PENDING").limit(1)),
      ]);
      if (!member.empty) fail("That email already has access to this workspace.");
      if (!pendingEmail.empty) fail("An invitation for this email is already pending.");
      if (!pendingG.empty) fail("This guardian already has a pending invitation. Revoke it to send a new one.");

      tx.set(ref, {
        tenantId: ctx.tenantId, kind: "GUARDIAN", role: "PARENT", email, guardianId, studentId, campusIds: [], employeeId: null,
        status: "PENDING", tokenHash: createHash("sha256").update(token).digest("hex"),
        expiresAt: Timestamp.fromMillis(Date.now() + INVITE_TTL_DAYS * 86400000), invitedBy: ctx.user.uid, createdAt: ts(),
      });
      auditInTx(tx, ctx.tenantId, { action: "GUARDIAN_INVITED", actorUid: ctx.user.uid, targetType: "guardian", targetId: guardianId });
    });
  } catch (e) { return result(e, "Could not create the invitation."); }
  refresh(slug);
  return { ok: true, message: "Invitation created.", path: `/invitation?s=${encodeURIComponent(slug)}&i=${ref.id}&k=${token}` };
}

export async function revokeGuardianInvitation(slug, inviteId) {
  const a = await auth(slug);
  if (a.error) return a.error;
  const { ctx } = a;
  const ref = adminDb.doc(`${base(ctx)}/invitations/${inviteId}`);
  try {
    await adminDb.runTransaction(async (tx) => {
      const s = await tx.get(ref);
      if (!s.exists || s.data().kind !== "GUARDIAN") fail("Invitation not found.");
      if (s.data().status !== "PENDING") fail("This invitation is no longer pending.");
      await assertGuardianCampuses(tx, ctx, s.data().guardianId);
      tx.update(ref, { status: "REVOKED", revokedBy: ctx.user.uid, revokedAt: ts() });
      auditInTx(tx, ctx.tenantId, { action: "GUARDIAN_INVITATION_REVOKED", actorUid: ctx.user.uid, targetType: "invitation", targetId: inviteId });
    });
  } catch (e) { return result(e, "Could not revoke the invitation."); }
  refresh(slug);
  return { ok: true, message: "Invitation revoked." };
}

/** Suspend/restore a parent's portal access (takes effect on their next request). */
export async function setParentAccess(slug, guardianId, status) {
  const a = await auth(slug);
  if (a.error) return a.error;
  const { ctx } = a;
  if (!["ACTIVE", "INACTIVE"].includes(status)) return { ok: false, error: "Invalid status." };
  try {
    await adminDb.runTransaction(async (tx) => {
      const g = await tx.get(adminDb.doc(`${base(ctx)}/guardians/${guardianId}`));
      if (!g.exists || !g.data().linkedUid) fail("This guardian has no portal login.");
      await assertGuardianCampuses(tx, ctx, guardianId);
      const mRef = adminDb.doc(`${base(ctx)}/members/${g.data().linkedUid}`);
      const m = await tx.get(mRef);
      if (!m.exists || m.data().role !== "PARENT") fail("Portal membership not found.");
      if (m.data().status === status) return;
      tx.update(mRef, { status, updatedBy: ctx.user.uid, updatedAt: ts() });
      auditInTx(tx, ctx.tenantId, { action: status === "ACTIVE" ? "PARENT_ACCESS_RESTORED" : "PARENT_ACCESS_SUSPENDED", actorUid: ctx.user.uid, targetType: "guardian", targetId: guardianId, changedFields: ["status"] });
    });
  } catch (e) { return result(e, "Could not change access."); }
  refresh(slug);
  return { ok: true, message: status === "ACTIVE" ? "Portal access restored." : "Portal access suspended." };
}
