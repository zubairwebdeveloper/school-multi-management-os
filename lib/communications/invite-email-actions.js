"use server";
import { createHash, timingSafeEqual } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { authorizeAction } from "@/lib/tenant/authorizeAction";
import { PERMISSIONS as P } from "@/lib/permissions";
import { grantableRoles, roleLabel } from "@/lib/permissions/grant";
import { appUrl, emailConfig, sendEmail } from "@/lib/communications/email";

const ID = /^[A-Za-z0-9]{10,40}$/, TOKEN = /^[A-Za-z0-9_-]{30,80}$/;

/**
 * Emails an existing invitation link to the address the invitation was created for. The caller must present the real token
 * (so only someone who just created the link can use it), the recipient is NEVER taken from the client, and sending is
 * throttled to once per 10 minutes per invitation.
 */
export async function emailInvitation(slug, { inviteId, token }) {
  const a = await authorizeAction(slug, { permission: [P.SETTINGS_MANAGE, P.STUDENTS_UPDATE] });
  if (a.error) return a.error;
  const { ctx } = a;
  if (!emailConfig()) return { ok: false, error: "Email is not configured on the server. Copy the link and send it yourself." };
  if (!appUrl()) return { ok: false, error: "APP_URL is not set on the server, so a correct link cannot be built." };
  if (!ID.test(inviteId || "") || !TOKEN.test(token || "")) return { ok: false, error: "Invalid invitation." };

  const ref = adminDb.doc(`tenants/${ctx.tenantId}/invitations/${inviteId}`);
  let invite;
  try {
    await adminDb.runTransaction(async (tx) => {
      const s = await tx.get(ref);
      if (!s.exists) throw new Error("Invitation not found.");
      const i = s.data();
      const x = Buffer.from(i.tokenHash, "hex"), y = Buffer.from(createHash("sha256").update(token).digest("hex"), "hex");
      if (i.status !== "PENDING" || i.expiresAt.toMillis() < Date.now() || x.length !== y.length || !timingSafeEqual(x, y)) throw new Error("This invitation is no longer valid.");
      if (i.kind === "GUARDIAN" ? false : !grantableRoles(ctx.permissions, ctx.orgWide).includes(i.role)) throw new Error("You cannot send this invitation.");
      if (i.lastEmailedAt && Date.now() - i.lastEmailedAt.toMillis() < 10 * 60 * 1000) throw new Error("This invitation was emailed a moment ago. Please wait a few minutes.");
      tx.update(ref, { lastEmailedAt: FieldValue.serverTimestamp() });
      invite = i;
    });
  } catch (e) { return { ok: false, error: e.message || "Could not send the email." }; }

  const link = `${appUrl()}/invitation?s=${encodeURIComponent(slug)}&i=${inviteId}&k=${token}`;
  const r = await sendEmail({
    to: invite.email,
    subject: `You are invited to ${ctx.tenant.name}`,
    text: `You have been invited to ${ctx.tenant.name} as ${roleLabel(invite.role)}.\n\nOpen this link, sign in with this email address (${invite.email}) and accept:\n${link}\n\nThe link expires in 7 days. If you were not expecting this, ignore this email.`,
  });
  if (!r.ok) {
    await ref.update({ lastEmailedAt: FieldValue.delete() }); // let them retry
    return { ok: false, error: r.error };
  }
  return { ok: true, message: `Invitation emailed to ${invite.email}.` };
}
