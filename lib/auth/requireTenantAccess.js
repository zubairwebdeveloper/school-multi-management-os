import "server-only";
import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { can } from "@/lib/permissions";

export class AccessError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

/**
 * Verifies the session cookie, loads the membership from Firestore (trusted),
 * and checks permission + campus. Throws AccessError on failure.
 * tenantId / campusId from the client are only *requested* values; access is
 * decided from the server-side membership document.
 */
export async function requireTenantAccess({ tenantId, permission, campusId }) {
  if (!tenantId) throw new AccessError(400, "tenantId required");

  const sessionCookie = (await cookies()).get("__session")?.value;
  if (!sessionCookie) throw new AccessError(401, "Not authenticated");

  let decoded;
  try {
    decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
  } catch {
    throw new AccessError(401, "Invalid session");
  }

  const snap = await adminDb.doc(`tenants/${tenantId}/members/${decoded.uid}`).get();
  if (!snap.exists) throw new AccessError(403, "Forbidden");

  const membership = snap.data();
  if (!can(membership, permission, campusId)) throw new AccessError(403, "Forbidden");

  return { uid: decoded.uid, tenantId, membership };
}

export function accessErrorResponse(err) {
  const status = err instanceof AccessError ? err.status : 500;
  const message = err instanceof AccessError ? err.message : "Internal error";
  return Response.json({ error: message }, { status });
}
