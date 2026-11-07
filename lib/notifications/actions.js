"use server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/auth/getSessionUser";

const SLUG = /^[a-z0-9-]{1,60}$/;

/** Works for every role: the caller must be an ACTIVE member of the workspace and can only touch their OWN notifications. */
async function member(slug) {
  const user = await getSessionUser();
  if (!user || !SLUG.test(slug)) return null;
  const s = await adminDb.doc(`tenantSlugs/${slug}`).get();
  if (!s.exists) return null;
  const tenantId = s.data().tenantId;
  const m = await adminDb.doc(`tenants/${tenantId}/members/${user.uid}`).get();
  return m.exists && m.data().status === "ACTIVE" ? { uid: user.uid, tenantId } : null;
}

export async function markAllRead(slug) {
  const m = await member(slug);
  if (!m) return { ok: false, error: "Not allowed." };
  const snap = await adminDb.collection(`tenants/${m.tenantId}/notifications`).where("recipientUid", "==", m.uid).where("readAt", "==", null).limit(400).get();
  if (snap.empty) return { ok: true, message: "Nothing to mark." };
  const batch = adminDb.batch();
  snap.docs.forEach((d) => batch.update(d.ref, { readAt: FieldValue.serverTimestamp() }));
  await batch.commit();
  revalidatePath(`/${slug}`, "layout");
  return { ok: true, message: "All marked as read." };
}

export async function setEmailPreference(slug, enabled) {
  const m = await member(slug);
  if (!m) return { ok: false, error: "Not allowed." };
  await adminDb.doc(`tenants/${m.tenantId}/members/${m.uid}`).update({ emailNotifications: !!enabled, updatedAt: FieldValue.serverTimestamp() });
  revalidatePath(`/${slug}`, "layout");
  return { ok: true, message: enabled ? "You will receive announcements by email." : "Email announcements are turned off. You will still see them here." };
}
