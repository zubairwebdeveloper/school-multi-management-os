import "server-only";
import { adminDb } from "@/lib/firebase/admin";

export async function getTenantSettings(tenantId) {
  const s = (await adminDb.doc(`tenants/${tenantId}`).get()).data()?.settings || {};
  return { timezone: s.timezone || "Asia/Karachi", currency: s.currency || "PKR" };
}
