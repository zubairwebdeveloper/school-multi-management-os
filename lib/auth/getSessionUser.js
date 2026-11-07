import "server-only";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";

/** Returns { uid, email, emailVerified, name } or null. Server-side only. */
export async function getSessionUser() {
  const value = (await cookies()).get("__session")?.value;
  if (!value) return null;
  try {
    const d = await adminAuth.verifySessionCookie(value, true);
    return { uid: d.uid, email: d.email || "", emailVerified: !!d.email_verified, name: d.name || "" };
  } catch {
    return null;
  }
}
