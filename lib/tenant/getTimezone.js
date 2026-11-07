import "server-only";
import { adminDb } from "@/lib/firebase/admin";

export async function getTenantTimezone(tenantId) {
  const snap = await adminDb.doc(`tenants/${tenantId}`).get();
  return snap.data()?.settings?.timezone || "Asia/Karachi";
}
