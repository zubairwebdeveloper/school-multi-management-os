"use server";
import { timingSafeEqual, createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { ROLE_DEFINITIONS } from "@/lib/permissions";
import { NON_INVITABLE } from "@/lib/permissions/grant";
import { auditInTx } from "@/lib/audit/tenantAudit";

const hash = (t) => createHash("sha256").update(t).digest("hex");
const SLUG = /^[a-z0-9-]{1,60}$/, ID = /^[A-Za-z0-9]{10,40}$/, TOKEN = /^[A-Za-z0-9_-]{30,80}$/;

class UserError extends Error {}
const fail = (m) => { throw new UserError(m); };
const BAD = "This invitation is invalid or has expired.";

function sameHash(a, b) {
  const x = Buffer.from(a, "hex"), y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Accepting is the ONLY way a membership is created for invited people (staff OR guardians).
 * Everything is re-validated here, in one transaction.
 */
export async function acceptInvitation(slug, inviteId, token) {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Please sign in first." };
  if (!user.emailVerified) return { ok: false, error: "Verify your email first." };
  if (!SLUG.test(slug) || !ID.test(inviteId) || !TOKEN.test(token)) return { ok: false, error: BAD };

  const slugSnap = await adminDb.doc(`tenantSlugs/${slug}`).get();
  if (!slugSnap.exists) return { ok: false, error: BAD };
  const tenantId = slugSnap.data().tenantId;
  const base = `tenants/${tenantId}`;
  const invRef = adminDb.doc(`${base}/invitations/${inviteId}`);
  const memRef = adminDb.doc(`${base}/members/${user.uid}`);

  try {
    await adminDb.runTransaction(async (tx) => {
      // ---------- reads ----------
      const [tenant, inv, mem] = await Promise.all([tx.get(adminDb.doc(base)), tx.get(invRef), tx.get(memRef)]);
      if (!tenant.exists || tenant.data().status !== "ACTIVE" || !inv.exists) fail(BAD);
      const i = inv.data();
      if (i.status !== "PENDING" || i.expiresAt.toMillis() < Date.now() || !sameHash(i.tokenHash, hash(token))) fail(BAD);
      if (i.email.toLowerCase() !== user.email.toLowerCase()) fail("This invitation was sent to a different email address. Sign in with the invited account.");
      if (mem.exists) fail("You already have access to this workspace.");
      if (!ROLE_DEFINITIONS[i.role]) fail(BAD);

      const isGuardian = i.kind === "GUARDIAN";
      let gRef = null, empRef = null;
      if (isGuardian) {
        if (i.role !== "PARENT" || !i.guardianId) fail(BAD);
        gRef = adminDb.doc(`${base}/guardians/${i.guardianId}`);
        const [g, links] = await Promise.all([
          tx.get(gRef),
          tx.get(adminDb.collection(`${base}/studentGuardians`).where("guardianId", "==", i.guardianId).limit(1)),
        ]);
        if (!g.exists || g.data().linkedUid) fail("This guardian record is no longer available. Ask the school for a new invitation.");
        if (links.empty) fail("No student is linked to this guardian any more. Contact the school.");
      } else {
        if (NON_INVITABLE.includes(i.role)) fail(BAD);
        // Campuses and the staff record must still be valid at acceptance time.
        const campuses = await Promise.all((i.campusIds || []).map((id) => tx.get(adminDb.doc(`${base}/campuses/${id}`))));
        if (campuses.some((c) => !c.exists || c.data().status !== "ACTIVE")) fail("One of the invited campuses is no longer active. Ask for a new invitation.");
        if (i.employeeId) {
          empRef = adminDb.doc(`${base}/employees/${i.employeeId}`);
          const e = await tx.get(empRef);
          if (!e.exists || e.data().status !== "ACTIVE" || e.data().linkedUid) fail("The linked staff record is no longer available. Ask for a new invitation.");
        }
      }

      // ---------- writes ----------
      tx.set(memRef, {
        uid: user.uid, email: user.email.toLowerCase(), role: i.role, status: "ACTIVE",
        campusIds: isGuardian ? [] : i.campusIds || [], employeeId: isGuardian ? null : i.employeeId || null,
        guardianId: isGuardian ? i.guardianId : null, extraPermissions: [], invitedBy: i.invitedBy, inviteId,
        createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
      if (empRef) tx.update(empRef, { linkedUid: user.uid, updatedAt: FieldValue.serverTimestamp() });
      if (gRef) tx.update(gRef, { linkedUid: user.uid, updatedAt: FieldValue.serverTimestamp() });
      tx.update(invRef, { status: "ACCEPTED", acceptedBy: user.uid, acceptedAt: FieldValue.serverTimestamp() });
      auditInTx(tx, tenantId, { action: "INVITATION_ACCEPTED", actorUid: user.uid, targetType: "invitation", targetId: inviteId, meta: { role: i.role, kind: isGuardian ? "GUARDIAN" : "STAFF" } });
    });
  } catch (e) {
    return { ok: false, error: e instanceof UserError ? e.message : "Could not accept the invitation." };
  }
  return { ok: true, slug };
}
