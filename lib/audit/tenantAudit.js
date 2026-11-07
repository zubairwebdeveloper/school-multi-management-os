import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

/**
 * Adds an audit entry to a Firestore transaction/batch so the change and its
 * audit record succeed or fail together. Store field NAMES, not sensitive values.
 */
export function auditInTx(tx, tenantId, { action, actorUid, targetType, targetId, changedFields = [], meta = {} }) {
  tx.set(adminDb.collection(`tenants/${tenantId}/auditLogs`).doc(), {
    action,
    actorUid,
    targetType,
    targetId,
    changedFields,
    meta,
    createdAt: FieldValue.serverTimestamp(),
  });
}
