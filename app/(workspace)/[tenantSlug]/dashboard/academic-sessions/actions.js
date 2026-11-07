"use server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { authorizeAction, failFrom } from "@/lib/tenant/authorizeAction";
import { PERMISSIONS as P } from "@/lib/permissions";
import { parseInput, sessionSchema, termSchema } from "@/lib/validations/academics";
import { auditInTx } from "@/lib/audit/tenantAudit";

const refresh = (slug) => revalidatePath(`/${slug}/dashboard/academic-sessions`);
const base = (ctx) => `tenants/${ctx.tenantId}`;

export async function createSession(slug, input) {
  const a = await authorizeAction(slug, { permission: P.ACADEMICS_MANAGE, requireOrgWide: true });
  if (a.error) return a.error;
  const { ctx } = a;
  const p = parseInput(sessionSchema, input);
  if (p.error) return p.error;
  const data = p.data;

  const col = adminDb.collection(`${base(ctx)}/academicSessions`);
  const ref = col.doc();
  try {
    await adminDb.runTransaction(async (tx) => {
      const all = (await tx.get(col)).docs.map((d) => d.data());
      if (all.some((s) => s.name.toLowerCase() === data.name.toLowerCase())) throw new Error("NAME");
      if (all.some((s) => data.startDate <= s.endDate && data.endDate >= s.startDate)) throw new Error("OVERLAP");
      tx.set(ref, {
        tenantId: ctx.tenantId, ...data, status: "DRAFT",
        createdBy: ctx.user.uid, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
      auditInTx(tx, ctx.tenantId, { action: "SESSION_CREATED", actorUid: ctx.user.uid, targetType: "academicSession", targetId: ref.id });
    });
  } catch (e) {
    return failFrom(e, { NAME: "A session with this name already exists.", OVERLAP: "These dates overlap another session." }, "Could not create the session.");
  }
  refresh(slug);
  return { ok: true, id: ref.id, message: "Session created." };
}

export async function setSessionStatus(slug, sessionId, status) {
  const a = await authorizeAction(slug, { permission: P.ACADEMICS_MANAGE, requireOrgWide: true });
  if (a.error) return a.error;
  const { ctx } = a;
  if (!["ACTIVE", "CLOSED"].includes(status)) return { ok: false, error: "Invalid status." };

  const col = adminDb.collection(`${base(ctx)}/academicSessions`);
  try {
    await adminDb.runTransaction(async (tx) => {
      const docs = (await tx.get(col)).docs;
      const target = docs.find((d) => d.id === sessionId);
      if (!target) throw new Error("MISSING");
      const cur = target.data().status;
      if (status === "ACTIVE") {
        if (cur !== "DRAFT") throw new Error("BAD");
        if (docs.some((d) => d.id !== sessionId && d.data().status === "ACTIVE")) throw new Error("OTHER_ACTIVE");
      } else if (cur !== "ACTIVE") throw new Error("BAD");

      tx.update(target.ref, {
        status, updatedBy: ctx.user.uid, updatedAt: FieldValue.serverTimestamp(),
        ...(status === "CLOSED" ? { closedAt: FieldValue.serverTimestamp() } : {}),
      });
      auditInTx(tx, ctx.tenantId, {
        action: status === "ACTIVE" ? "SESSION_ACTIVATED" : "SESSION_CLOSED",
        actorUid: ctx.user.uid, targetType: "academicSession", targetId: sessionId, changedFields: ["status"],
      });
    });
  } catch (e) {
    return failFrom(e, {
      MISSING: "Session not found.",
      BAD: "This status change is not allowed.",
      OTHER_ACTIVE: "Another session is active. Close it first.",
    }, "Could not change the session status.");
  }
  refresh(slug);
  return { ok: true, message: status === "ACTIVE" ? "Session activated." : "Session closed." };
}

export async function addTerm(slug, sessionId, input) {
  const a = await authorizeAction(slug, { permission: P.ACADEMICS_MANAGE, requireOrgWide: true });
  if (a.error) return a.error;
  const { ctx } = a;
  const p = parseInput(termSchema, input);
  if (p.error) return p.error;
  const data = p.data;

  const sessionRef = adminDb.doc(`${base(ctx)}/academicSessions/${sessionId}`);
  const termsCol = adminDb.collection(`${base(ctx)}/academicTerms`);
  const ref = termsCol.doc();
  try {
    await adminDb.runTransaction(async (tx) => {
      const [sSnap, tSnap] = await Promise.all([tx.get(sessionRef), tx.get(termsCol.where("sessionId", "==", sessionId))]);
      if (!sSnap.exists) throw new Error("MISSING");
      const s = sSnap.data();
      if (s.status === "CLOSED") throw new Error("CLOSED");
      if (data.startDate < s.startDate || data.endDate > s.endDate) throw new Error("RANGE");
      const terms = tSnap.docs.map((d) => d.data());
      if (terms.some((t) => t.name.toLowerCase() === data.name.toLowerCase())) throw new Error("NAME");
      if (terms.some((t) => data.startDate <= t.endDate && data.endDate >= t.startDate)) throw new Error("OVERLAP");
      tx.set(ref, { tenantId: ctx.tenantId, sessionId, ...data, createdBy: ctx.user.uid, createdAt: FieldValue.serverTimestamp() });
      auditInTx(tx, ctx.tenantId, { action: "TERM_CREATED", actorUid: ctx.user.uid, targetType: "academicTerm", targetId: ref.id, meta: { sessionId } });
    });
  } catch (e) {
    return failFrom(e, {
      MISSING: "Session not found.", CLOSED: "This session is closed.",
      RANGE: "The term must fall inside the session dates.",
      NAME: "A term with this name already exists in this session.",
      OVERLAP: "These dates overlap another term.",
    }, "Could not add the term.");
  }
  refresh(slug);
  return { ok: true, message: "Term added." };
}

export async function deleteTerm(slug, termId) {
  const a = await authorizeAction(slug, { permission: P.ACADEMICS_MANAGE, requireOrgWide: true });
  if (a.error) return a.error;
  const { ctx } = a;
  const ref = adminDb.doc(`${base(ctx)}/academicTerms/${termId}`);
  try {
    await adminDb.runTransaction(async (tx) => {
      const t = await tx.get(ref);
      if (!t.exists) throw new Error("MISSING");
      const s = await tx.get(adminDb.doc(`${base(ctx)}/academicSessions/${t.data().sessionId}`));
      if (s.exists && s.data().status === "CLOSED") throw new Error("CLOSED");
      // TODO(Phase 11): block deletion when exams/assessments reference this term.
      tx.delete(ref);
      auditInTx(tx, ctx.tenantId, { action: "TERM_DELETED", actorUid: ctx.user.uid, targetType: "academicTerm", targetId: termId });
    });
  } catch (e) {
    return failFrom(e, { MISSING: "Term not found.", CLOSED: "This session is closed." }, "Could not delete the term.");
  }
  refresh(slug);
  return { ok: true, message: "Term removed." };
}
