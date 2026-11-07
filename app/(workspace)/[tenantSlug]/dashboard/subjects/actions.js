"use server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { authorizeAction, failFrom } from "@/lib/tenant/authorizeAction";
import { PERMISSIONS as P } from "@/lib/permissions";
import { parseInput, subjectSchema } from "@/lib/validations/academics";
import { auditInTx } from "@/lib/audit/tenantAudit";

const refresh = (slug) => revalidatePath(`/${slug}/dashboard/subjects`);
const auth = (slug) => authorizeAction(slug, { permission: P.ACADEMICS_MANAGE, requireOrgWide: true });

function conflicts(others, data) {
  if (others.some((s) => s.name.toLowerCase() === data.name.toLowerCase() && s.curriculum === data.curriculum)) return "NAME";
  if (data.code && others.some((s) => s.code === data.code)) return "CODE";
  return null;
}
const MSG = { NAME: "This subject already exists for that curriculum.", CODE: "This subject code is already used.", MISSING: "Subject not found." };

export async function createSubject(slug, input) {
  const a = await auth(slug);
  if (a.error) return a.error;
  const { ctx } = a;
  const p = parseInput(subjectSchema, input);
  if (p.error) return p.error;

  const col = adminDb.collection(`tenants/${ctx.tenantId}/subjects`);
  const ref = col.doc();
  try {
    await adminDb.runTransaction(async (tx) => {
      const others = (await tx.get(col)).docs.map((d) => d.data());
      const c = conflicts(others, p.data);
      if (c) throw new Error(c);
      tx.set(ref, {
        tenantId: ctx.tenantId, ...p.data, status: "ACTIVE", createdBy: ctx.user.uid,
        createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
      auditInTx(tx, ctx.tenantId, { action: "SUBJECT_CREATED", actorUid: ctx.user.uid, targetType: "subject", targetId: ref.id });
    });
  } catch (e) {
    return failFrom(e, MSG, "Could not create the subject.");
  }
  refresh(slug);
  return { ok: true, message: "Subject created." };
}

export async function updateSubject(slug, subjectId, input) {
  const a = await auth(slug);
  if (a.error) return a.error;
  const { ctx } = a;
  const p = parseInput(subjectSchema, input);
  if (p.error) return p.error;

  const col = adminDb.collection(`tenants/${ctx.tenantId}/subjects`);
  const ref = col.doc(subjectId);
  try {
    await adminDb.runTransaction(async (tx) => {
      const docs = (await tx.get(col)).docs;
      const cur = docs.find((d) => d.id === subjectId);
      if (!cur) throw new Error("MISSING");
      const c = conflicts(docs.filter((d) => d.id !== subjectId).map((d) => d.data()), p.data);
      if (c) throw new Error(c);
      const changedFields = Object.keys(p.data).filter((k) => (cur.data()[k] ?? "") !== p.data[k]);
      if (!changedFields.length) return;
      tx.update(ref, { ...p.data, updatedBy: ctx.user.uid, updatedAt: FieldValue.serverTimestamp() });
      auditInTx(tx, ctx.tenantId, { action: "SUBJECT_UPDATED", actorUid: ctx.user.uid, targetType: "subject", targetId: subjectId, changedFields });
    });
  } catch (e) {
    return failFrom(e, MSG, "Could not save changes.");
  }
  refresh(slug);
  return { ok: true, message: "Subject updated." };
}

export async function setSubjectStatus(slug, subjectId, status) {
  const a = await auth(slug);
  if (a.error) return a.error;
  const { ctx } = a;
  if (!["ACTIVE", "ARCHIVED"].includes(status)) return { ok: false, error: "Invalid status." };
  const ref = adminDb.doc(`tenants/${ctx.tenantId}/subjects/${subjectId}`);
  try {
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("MISSING");
      if (snap.data().status === status) return;
      tx.update(ref, { status, updatedBy: ctx.user.uid, updatedAt: FieldValue.serverTimestamp() });
      auditInTx(tx, ctx.tenantId, {
        action: status === "ARCHIVED" ? "SUBJECT_ARCHIVED" : "SUBJECT_RESTORED",
        actorUid: ctx.user.uid, targetType: "subject", targetId: subjectId, changedFields: ["status"],
      });
    });
  } catch (e) {
    return failFrom(e, MSG, "Could not change the status.");
  }
  refresh(slug);
  return { ok: true, message: status === "ARCHIVED" ? "Subject archived." : "Subject restored." };
}
