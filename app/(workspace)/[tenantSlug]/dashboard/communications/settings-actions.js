"use server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { authorizeAction } from "@/lib/tenant/authorizeAction";
import { PERMISSIONS as P } from "@/lib/permissions";
import { auditInTx } from "@/lib/audit/tenantAudit";

/** Which automatic parent alerts are on. Organization-wide settings: SETTINGS_MANAGE + organization-wide scope. */
export async function saveAlertSettings(slug, input) {
  const a = await authorizeAction(slug, { permission: P.SETTINGS_MANAGE, requireOrgWide: true });
  if (a.error) return a.error;
  const { ctx } = a;
  const next = { absenceAlerts: input?.absenceAlerts === true, resultAlerts: input?.resultAlerts === true, autoEmail: input?.autoEmail === true };
  const ref = adminDb.doc(`tenants/${ctx.tenantId}`);
  await adminDb.runTransaction(async (tx) => {
    tx.update(ref, { "settings.notifications": next, updatedAt: FieldValue.serverTimestamp() });
    auditInTx(tx, ctx.tenantId, { action: "ALERT_SETTINGS_CHANGED", actorUid: ctx.user.uid, targetType: "tenant", targetId: ctx.tenantId, changedFields: ["settings.notifications"], meta: next });
  });
  revalidatePath(`/${slug}/dashboard/communications`);
  return { ok: true, message: "Alert settings saved." };
}
