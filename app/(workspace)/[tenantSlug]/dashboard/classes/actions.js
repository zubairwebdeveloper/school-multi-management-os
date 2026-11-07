"use server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { DENIED, authorizeAction, failFrom, hasCampus } from "@/lib/tenant/authorizeAction";
import { PERMISSIONS as P } from "@/lib/permissions";
import { classSchema, classUpdateSchema, parseInput, sectionSchema, sectionUpdateSchema } from "@/lib/validations/academics";
import { auditInTx } from "@/lib/audit/tenantAudit";

const refresh = (slug) => revalidatePath(`/${slug}/dashboard/classes`);
const base = (ctx) => `tenants/${ctx.tenantId}`;
const auth = (slug) => authorizeAction(slug, { permission: P.ACADEMICS_MANAGE });

export async function createClass(slug, input) {
  const a = await auth(slug);
  if (a.error) return a.error;
  const { ctx } = a;
  const p = parseInput(classSchema, input);
  if (p.error) return p.error;
  const data = p.data;
  if (!hasCampus(ctx, data.campusId)) return DENIED;

  const col = adminDb.collection(`${base(ctx)}/classes`);
  const ref = col.doc();
  try {
    await adminDb.runTransaction(async (tx) => {
      const existing = (await tx.get(col.where("campusId", "==", data.campusId))).docs.map((d) => d.data());
      if (existing.some((c) => c.name.toLowerCase() === data.name.toLowerCase())) throw new Error("NAME");
      tx.set(ref, {
        tenantId: ctx.tenantId, ...data, status: "ACTIVE",
        createdBy: ctx.user.uid, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
      auditInTx(tx, ctx.tenantId, { action: "CLASS_CREATED", actorUid: ctx.user.uid, targetType: "class", targetId: ref.id, meta: { campusId: data.campusId } });
    });
  } catch (e) {
    return failFrom(e, { NAME: "This campus already has a class with that name." }, "Could not create the class.");
  }
  refresh(slug);
  return { ok: true, message: "Class created." };
}

export async function updateClass(slug, classId, input) {
  const a = await auth(slug);
  if (a.error) return a.error;
  const { ctx } = a;
  const p = parseInput(classUpdateSchema, input);
  if (p.error) return p.error;
  const data = p.data;

  const col = adminDb.collection(`${base(ctx)}/classes`);
  const ref = col.doc(classId);
  try {
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("MISSING");
      const cur = snap.data();
      if (!hasCampus(ctx, cur.campusId)) throw new Error("DENIED");
      const sameCampus = (await tx.get(col.where("campusId", "==", cur.campusId))).docs;
      if (sameCampus.some((d) => d.id !== classId && d.data().name.toLowerCase() === data.name.toLowerCase())) throw new Error("NAME");
      const changedFields = Object.keys(data).filter((k) => (cur[k] ?? "") !== data[k]);
      if (!changedFields.length) return;
      tx.update(ref, { ...data, updatedBy: ctx.user.uid, updatedAt: FieldValue.serverTimestamp() });
      auditInTx(tx, ctx.tenantId, { action: "CLASS_UPDATED", actorUid: ctx.user.uid, targetType: "class", targetId: classId, changedFields });
    });
  } catch (e) {
    if (e.message === "DENIED") return DENIED;
    return failFrom(e, { MISSING: "Class not found.", NAME: "This campus already has a class with that name." }, "Could not save changes.");
  }
  refresh(slug);
  return { ok: true, message: "Class updated." };
}

export async function setClassStatus(slug, classId, status) {
  const a = await auth(slug);
  if (a.error) return a.error;
  const { ctx } = a;
  if (!["ACTIVE", "ARCHIVED"].includes(status)) return { ok: false, error: "Invalid status." };

  const ref = adminDb.doc(`${base(ctx)}/classes/${classId}`);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: "Class not found." };
  if (!hasCampus(ctx, snap.data().campusId)) return DENIED;

  if (status === "ARCHIVED") {
    const open = await adminDb.collection(`${base(ctx)}/sections`)
      .where("classId", "==", classId).where("status", "==", "ACTIVE").count().get();
    if (open.data().count > 0) return { ok: false, error: "Archive this class's active sections first." };
  }
  try {
    await adminDb.runTransaction(async (tx) => {
      tx.update(ref, { status, updatedBy: ctx.user.uid, updatedAt: FieldValue.serverTimestamp() });
      auditInTx(tx, ctx.tenantId, {
        action: status === "ARCHIVED" ? "CLASS_ARCHIVED" : "CLASS_RESTORED",
        actorUid: ctx.user.uid, targetType: "class", targetId: classId, changedFields: ["status"],
      });
    });
  } catch {
    return { ok: false, error: "Could not change the class status." };
  }
  refresh(slug);
  return { ok: true, message: status === "ARCHIVED" ? "Class archived." : "Class restored." };
}

export async function createSection(slug, input) {
  const a = await auth(slug);
  if (a.error) return a.error;
  const { ctx } = a;
  const p = parseInput(sectionSchema, input);
  if (p.error) return p.error;
  const data = p.data;

  const col = adminDb.collection(`${base(ctx)}/sections`);
  const ref = col.doc();
  try {
    await adminDb.runTransaction(async (tx) => {
      const [cSnap, sSnap, existing] = await Promise.all([
        tx.get(adminDb.doc(`${base(ctx)}/classes/${data.classId}`)),
        tx.get(adminDb.doc(`${base(ctx)}/academicSessions/${data.sessionId}`)),
        tx.get(col.where("classId", "==", data.classId)),
      ]);
      if (!cSnap.exists || cSnap.data().status !== "ACTIVE") throw new Error("CLASS");
      const cls = cSnap.data();
      if (!hasCampus(ctx, cls.campusId)) throw new Error("DENIED");
      if (!sSnap.exists || sSnap.data().status === "CLOSED") throw new Error("SESSION");
      const dup = existing.docs.some((d) => d.data().sessionId === data.sessionId && d.data().name.toLowerCase() === data.name.toLowerCase());
      if (dup) throw new Error("NAME");

      tx.set(ref, {
        tenantId: ctx.tenantId,
        campusId: cls.campusId, // always copied from the class, never from the client
        classId: data.classId, sessionId: data.sessionId, name: data.name, capacity: data.capacity,
        status: "ACTIVE", createdBy: ctx.user.uid,
        createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
      });
      auditInTx(tx, ctx.tenantId, { action: "SECTION_CREATED", actorUid: ctx.user.uid, targetType: "section", targetId: ref.id, meta: { classId: data.classId, sessionId: data.sessionId } });
    });
  } catch (e) {
    if (e.message === "DENIED") return DENIED;
    return failFrom(e, {
      CLASS: "Class not found or archived.",
      SESSION: "Choose an open academic session.",
      NAME: "This class already has that section in this session.",
    }, "Could not create the section.");
  }
  refresh(slug);
  return { ok: true, message: "Section created." };
}

async function activeStudents(ctx, sectionId) {
  const r = await adminDb.collection(`${base(ctx)}/students`)
    .where("sectionId", "==", sectionId).where("status", "==", "ACTIVE").count().get();
  return r.data().count;
}

export async function updateSection(slug, sectionId, input) {
  const a = await auth(slug);
  if (a.error) return a.error;
  const { ctx } = a;
  const p = parseInput(sectionUpdateSchema, input);
  if (p.error) return p.error;
  const data = p.data;

  const col = adminDb.collection(`${base(ctx)}/sections`);
  const ref = col.doc(sectionId);
  if ((await activeStudents(ctx, sectionId)) > data.capacity) {
    return { ok: false, error: "Capacity cannot be lower than the number of enrolled students.", fieldErrors: { capacity: ["Below current enrollment"] } };
  }
  try {
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("MISSING");
      const cur = snap.data();
      if (!hasCampus(ctx, cur.campusId)) throw new Error("DENIED");
      const sess = await tx.get(adminDb.doc(`${base(ctx)}/academicSessions/${cur.sessionId}`));
      if (sess.exists && sess.data().status === "CLOSED") throw new Error("CLOSED");
      const sibs = (await tx.get(col.where("classId", "==", cur.classId))).docs;
      if (sibs.some((d) => d.id !== sectionId && d.data().sessionId === cur.sessionId && d.data().name.toLowerCase() === data.name.toLowerCase())) throw new Error("NAME");
      const changedFields = Object.keys(data).filter((k) => cur[k] !== data[k]);
      if (!changedFields.length) return;
      tx.update(ref, { ...data, updatedBy: ctx.user.uid, updatedAt: FieldValue.serverTimestamp() });
      auditInTx(tx, ctx.tenantId, { action: "SECTION_UPDATED", actorUid: ctx.user.uid, targetType: "section", targetId: sectionId, changedFields });
    });
  } catch (e) {
    if (e.message === "DENIED") return DENIED;
    return failFrom(e, {
      MISSING: "Section not found.", CLOSED: "This session is closed.",
      NAME: "This class already has that section in this session.",
    }, "Could not save changes.");
  }
  refresh(slug);
  return { ok: true, message: "Section updated." };
}

export async function setSectionStatus(slug, sectionId, status) {
  const a = await auth(slug);
  if (a.error) return a.error;
  const { ctx } = a;
  if (!["ACTIVE", "ARCHIVED"].includes(status)) return { ok: false, error: "Invalid status." };

  const ref = adminDb.doc(`${base(ctx)}/sections/${sectionId}`);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, error: "Section not found." };
  if (!hasCampus(ctx, snap.data().campusId)) return DENIED;
  if (status === "ARCHIVED" && (await activeStudents(ctx, sectionId)) > 0) {
    return { ok: false, error: "Move the enrolled students to another section first." };
  }
  try {
    await adminDb.runTransaction(async (tx) => {
      tx.update(ref, { status, updatedBy: ctx.user.uid, updatedAt: FieldValue.serverTimestamp() });
      auditInTx(tx, ctx.tenantId, {
        action: status === "ARCHIVED" ? "SECTION_ARCHIVED" : "SECTION_RESTORED",
        actorUid: ctx.user.uid, targetType: "section", targetId: sectionId, changedFields: ["status"],
      });
    });
  } catch {
    return { ok: false, error: "Could not change the section status." };
  }
  refresh(slug);
  return { ok: true, message: status === "ARCHIVED" ? "Section archived." : "Section restored." };
}
