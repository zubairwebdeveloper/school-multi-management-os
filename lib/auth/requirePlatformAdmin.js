import "server-only";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

const PLATFORM_ROLES = ["SUPER_ADMIN", "PLATFORM_SUPPORT"];

/** Returns { uid, email, role } if the session user is an active platform admin, else null. */
export async function getPlatformAdmin() {
  const value = (await cookies()).get("__session")?.value;
  if (!value) return null;
  try {
    const d = await adminAuth.verifySessionCookie(value, true);
    const snap = await adminDb.doc(`platformAdmins/${d.uid}`).get();
    if (!snap.exists) return null;
    const { role, status } = snap.data();
    if (status !== "ACTIVE" || !PLATFORM_ROLES.includes(role)) return null;
    return { uid: d.uid, email: d.email || "", role };
  } catch {
    return null;
  }
}

/** For route handlers. Only SUPER_ADMIN may approve/reject; others are read-only. */
export async function requirePlatformAdminApi({ write = false } = {}) {
  const admin = await getPlatformAdmin();
  if (!admin) throw new AccessError(403, "Forbidden");
  if (write && admin.role !== "SUPER_ADMIN") throw new AccessError(403, "Forbidden");
  return admin;
}
