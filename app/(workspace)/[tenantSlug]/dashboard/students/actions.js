"use server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { DENIED, authorizeAction, failFrom, hasCampus } from "@/lib/tenant/authorizeAction";
import { PERMISSIONS as P } from "@/lib/permissions";
import {
  changeSectionSchema, createStudentSchema, guardianSchema, normalizePhone,
  parseNested, statusChangeSchema, studentDetailsSchema,
} from "@/lib/validations/students";
import { auditInTx } from "@/lib/audit/tenantAudit";

const base = (ctx) => `tenants/${ctx.tenantId}`;
const refresh = (slug, id) => {
  revalidatePath(`/${slug}/dashboard/students`);
  if (id) revalidatePath(`/${slug}/dashboard/students/${id}`);
};
const ts = () => FieldValue.serverTimestamp();

const MSG = {
  MISSING: "Record not found.",
  DENIED: DENIED.error,
  CLASS: "Choose an active class in the selected campus.",
  SECTION: "Choose an active section of that class.",
  SESSION: "The section's academic session must be active.",
  FULL: "This section is full.",
  INACTIVE: "This student is not active.",
  SAME: "The student is already in that section.",
  DUP_LINK: "This guardian is already linked to the student.",
  LAST: "A student must keep at least one guardian.",
  PRIMARY: "Make another guardian primary first.",
};

/** Validates class + section + ACTIVE session inside a transaction and returns them. */
async function loadPlacement(tx, ctx, { campusId, classId, sectionId }) {
  const [cSnap, sSnap] = await Promise.all([
    tx.get(adminDb.doc(`${base(ctx)}/classes/${classId}`)),
    tx.get(adminDb.doc(`${base(ctx)}/sections/${sectionId}`)),
  ]);
  if (!cSnap.exists || cSnap.data().status !== "ACTIVE" || cSnap.data().campusId !== campusId) throw new Error("CLASS");
  if (!sSnap.exists || sSnap.data().status !== "ACTIVE" || sSnap.data().classId !== classId) throw new Error("SECTION");
  const sec = sSnap.data();
  const sessSnap = await tx.get(adminDb.doc(`${base(ctx)}/academicSessions/${sec.sessionId}`));
  if (!sessSnap.exists || sessSnap.data().status !== "ACTIVE") throw new Error("SESSION");
  const enrolled = await tx.get(
    adminDb.collection(`${base(ctx)}/students`).where("sectionId", "==", sectionId).where("status", "==", "ACTIVE")
  );
  return { sec, enrolledDocs: enrolled.docs, sessionId: sec.sessionId };
}

export async function createStudent(slug, input) {
  const a = await authorizeAction(slug, { permission: P.STUDENTS_CREATE });
  if (a.error) return a.error;
  const { ctx } = a;
  const p = parseNested(createStudentSchema, input);
  if (p.error) return p.error;
  const { guardian, campusId, classId, sectionId, ...details } = p.data;
  if (!hasCampus(ctx, campusId)) return DENIED;

  const studentRef = adminDb.collection(`${base(ctx)}/students`).doc();
  const enrollRef = adminDb.collection(`${base(ctx)}/enrollments`).doc();
  const linkRef = adminDb.collection(`${base(ctx)}/studentGuardians`).doc();
  const counterRef = adminDb.doc(`${base(ctx)}/counters/admissionNumber`);
  const phoneN = normalizePhone(guardian.phone);
  let reused = false;

  try {
    await adminDb.runTransaction(async (tx) => {
      // ---- reads ----
      const { sec, enrolledDocs, sessionId } = await loadPlacement(tx, ctx, { campusId, classId, sectionId });
      if (enrolledDocs.length >= sec.capacity) throw new Error("FULL");
      const [counter, existing] = await Promise.all([
        tx.get(counterRef),
        tx.get(adminDb.collection(`${base(ctx)}/guardians`).where("phoneNormalized", "==", phoneN).limit(1)),
      ]);
      const n = counter.exists ? counter.data().next : 1;
      const admissionNumber = `ADM-${String(n).padStart(5, "0")}`;

      // ---- writes ----
      let guardianId;
      if (!existing.empty) {
        guardianId = existing.docs[0].id; // sibling: reuse the guardian with the same phone
        reused = true;
      } else {
        const gRef = adminDb.collection(`${base(ctx)}/guardians`).doc();
        guardianId = gRef.id;
        tx.set(gRef, {
          tenantId: ctx.tenantId, fullName: guardian.fullName, phone: guardian.phone, phoneNormalized: phoneN,
          email: guardian.email, createdBy: ctx.user.uid, createdAt: ts(), updatedAt: ts(),
        });
      }

      tx.set(counterRef, { next: n + 1, updatedAt: ts() });
      tx.set(studentRef, {
        tenantId: ctx.tenantId, campusId, admissionNumber, ...details,
        nameLower: `${details.firstName} ${details.lastName}`.toLowerCase(),
        classId, sectionId, sessionId, enrollmentId: enrollRef.id, status: "ACTIVE",
        createdBy: ctx.user.uid, createdAt: ts(), updatedAt: ts(),
      });
      tx.set(enrollRef, {
        tenantId: ctx.tenantId, studentId: studentRef.id, campusId, sessionId, classId, sectionId,
        status: "ACTIVE", createdBy: ctx.user.uid, createdAt: ts(),
      });
      tx.set(linkRef, {
        tenantId: ctx.tenantId, studentId: studentRef.id, guardianId, relationship: guardian.relationship,
        isPrimary: true, createdBy: ctx.user.uid, createdAt: ts(),
      });
      auditInTx(tx, ctx.tenantId, {
        action: "STUDENT_CREATED", actorUid: ctx.user.uid, targetType: "student", targetId: studentRef.id,
        meta: { campusId, admissionNumber },
      });
    });
  } catch (e) {
    return failFrom(e, MSG, "Could not create the student.");
  }
  refresh(slug);
  return {
    ok: true, id: studentRef.id,
    message: reused ? "Student admitted and linked to an existing guardian." : "Student admitted.",
  };
}

async function loadStudentForUpdate(slug) {
  const a = await authorizeAction(slug, { permission: P.STUDENTS_UPDATE });
  return a;
}

export async function updateStudent(slug, studentId, input) {
  const a = await loadStudentForUpdate(slug);
  if (a.error) return a.error;
  const { ctx } = a;
  const p = parseNested(studentDetailsSchema, input);
  if (p.error) return p.error;
  const data = p.data;
  const ref = adminDb.doc(`${base(ctx)}/students/${studentId}`);
  try {
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("MISSING");
      const cur = snap.data();
      if (!hasCampus(ctx, cur.campusId)) throw new Error("DENIED");
      const changedFields = Object.keys(data).filter((k) => (cur[k] ?? "") !== data[k]);
      if (!changedFields.length) return;
      tx.update(ref, {
        ...data, nameLower: `${data.firstName} ${data.lastName}`.toLowerCase(),
        updatedBy: ctx.user.uid, updatedAt: ts(),
      });
      auditInTx(tx, ctx.tenantId, { action: "STUDENT_UPDATED", actorUid: ctx.user.uid, targetType: "student", targetId: studentId, changedFields });
    });
  } catch (e) {
    return failFrom(e, MSG, "Could not save changes.");
  }
  refresh(slug, studentId);
  return { ok: true, message: "Student updated." };
}

export async function changeSection(slug, studentId, input) {
  const a = await loadStudentForUpdate(slug);
  if (a.error) return a.error;
  const { ctx } = a;
  const p = parseNested(changeSectionSchema, input);
  if (p.error) return p.error;
  const { classId, sectionId } = p.data;
  const ref = adminDb.doc(`${base(ctx)}/students/${studentId}`);
  const newEnroll = adminDb.collection(`${base(ctx)}/enrollments`).doc();
  try {
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("MISSING");
      const s = snap.data();
      if (!hasCampus(ctx, s.campusId)) throw new Error("DENIED");
      if (s.status !== "ACTIVE") throw new Error("INACTIVE");
      if (s.sectionId === sectionId) throw new Error("SAME");
      // Same-campus moves only. Cross-campus transfers are a separate, approved workflow.
      const { sec, enrolledDocs, sessionId } = await loadPlacement(tx, ctx, { campusId: s.campusId, classId, sectionId });
      if (enrolledDocs.length >= sec.capacity) throw new Error("FULL");

      if (s.enrollmentId) {
        tx.update(adminDb.doc(`${base(ctx)}/enrollments/${s.enrollmentId}`), { status: "ENDED", endedAt: ts(), endReason: "SECTION_CHANGE" });
      }
      tx.set(newEnroll, {
        tenantId: ctx.tenantId, studentId, campusId: s.campusId, sessionId, classId, sectionId,
        status: "ACTIVE", previousEnrollmentId: s.enrollmentId || null, createdBy: ctx.user.uid, createdAt: ts(),
      });
      tx.update(ref, { classId, sectionId, sessionId, enrollmentId: newEnroll.id, updatedBy: ctx.user.uid, updatedAt: ts() });
      auditInTx(tx, ctx.tenantId, { action: "STUDENT_SECTION_CHANGED", actorUid: ctx.user.uid, targetType: "student", targetId: studentId, changedFields: ["classId", "sectionId"] });
    });
  } catch (e) {
    return failFrom(e, MSG, "Could not change the section.");
  }
  refresh(slug, studentId);
  return { ok: true, message: "Section changed." };
}

export async function changeStudentStatus(slug, studentId, input) {
  const a = await loadStudentForUpdate(slug);
  if (a.error) return a.error;
  const { ctx } = a;
  const p = parseNested(statusChangeSchema, input);
  if (p.error) return p.error;
  const { status, reason } = p.data;
  const ref = adminDb.doc(`${base(ctx)}/students/${studentId}`);
  try {
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("MISSING");
      const s = snap.data();
      if (!hasCampus(ctx, s.campusId)) throw new Error("DENIED");
      if (s.status !== "ACTIVE") throw new Error("INACTIVE");
      if (s.enrollmentId) {
        tx.update(adminDb.doc(`${base(ctx)}/enrollments/${s.enrollmentId}`), { status: "ENDED", endedAt: ts(), endReason: status });
      }
      // History is preserved: the student record and enrollments are never deleted.
      tx.update(ref, { status, statusReason: reason, statusChangedAt: ts(), updatedBy: ctx.user.uid, updatedAt: ts() });
      auditInTx(tx, ctx.tenantId, { action: `STUDENT_${status}`, actorUid: ctx.user.uid, targetType: "student", targetId: studentId, changedFields: ["status"] });
    });
  } catch (e) {
    return failFrom(e, MSG, "Could not change the status.");
  }
  refresh(slug, studentId);
  return { ok: true, message: status === "WITHDRAWN" ? "Student withdrawn." : "Student marked as graduated." };
}

export async function addGuardian(slug, studentId, input) {
  const a = await loadStudentForUpdate(slug);
  if (a.error) return a.error;
  const { ctx } = a;
  const p = parseNested(guardianSchema, input);
  if (p.error) return p.error;
  const g = p.data;
  const phoneN = normalizePhone(g.phone);
  const studentRef = adminDb.doc(`${base(ctx)}/students/${studentId}`);
  const linkRef = adminDb.collection(`${base(ctx)}/studentGuardians`).doc();
  try {
    await adminDb.runTransaction(async (tx) => {
      const [sSnap, existing, links] = await Promise.all([
        tx.get(studentRef),
        tx.get(adminDb.collection(`${base(ctx)}/guardians`).where("phoneNormalized", "==", phoneN).limit(1)),
        tx.get(adminDb.collection(`${base(ctx)}/studentGuardians`).where("studentId", "==", studentId)),
      ]);
      if (!sSnap.exists) throw new Error("MISSING");
      if (!hasCampus(ctx, sSnap.data().campusId)) throw new Error("DENIED");

      let guardianId;
      if (!existing.empty) {
        guardianId = existing.docs[0].id;
        if (links.docs.some((d) => d.data().guardianId === guardianId)) throw new Error("DUP_LINK");
      } else {
        const gRef = adminDb.collection(`${base(ctx)}/guardians`).doc();
        guardianId = gRef.id;
        tx.set(gRef, { tenantId: ctx.tenantId, fullName: g.fullName, phone: g.phone, phoneNormalized: phoneN, email: g.email, createdBy: ctx.user.uid, createdAt: ts(), updatedAt: ts() });
      }
      tx.set(linkRef, { tenantId: ctx.tenantId, studentId, guardianId, relationship: g.relationship, isPrimary: false, createdBy: ctx.user.uid, createdAt: ts() });
      auditInTx(tx, ctx.tenantId, { action: "GUARDIAN_LINKED", actorUid: ctx.user.uid, targetType: "student", targetId: studentId });
    });
  } catch (e) {
    return failFrom(e, MSG, "Could not add the guardian.");
  }
  refresh(slug, studentId);
  return { ok: true, message: "Guardian added." };
}

export async function setPrimaryGuardian(slug, studentId, linkId) {
  const a = await loadStudentForUpdate(slug);
  if (a.error) return a.error;
  const { ctx } = a;
  try {
    await adminDb.runTransaction(async (tx) => {
      const [sSnap, links] = await Promise.all([
        tx.get(adminDb.doc(`${base(ctx)}/students/${studentId}`)),
        tx.get(adminDb.collection(`${base(ctx)}/studentGuardians`).where("studentId", "==", studentId)),
      ]);
      if (!sSnap.exists || !links.docs.some((d) => d.id === linkId)) throw new Error("MISSING");
      if (!hasCampus(ctx, sSnap.data().campusId)) throw new Error("DENIED");
      links.docs.forEach((d) => tx.update(d.ref, { isPrimary: d.id === linkId }));
      auditInTx(tx, ctx.tenantId, { action: "PRIMARY_GUARDIAN_CHANGED", actorUid: ctx.user.uid, targetType: "student", targetId: studentId });
    });
  } catch (e) {
    return failFrom(e, MSG, "Could not change the primary guardian.");
  }
  refresh(slug, studentId);
  return { ok: true, message: "Primary guardian updated." };
}

export async function removeGuardianLink(slug, studentId, linkId) {
  const a = await loadStudentForUpdate(slug);
  if (a.error) return a.error;
  const { ctx } = a;
  try {
    await adminDb.runTransaction(async (tx) => {
      const [sSnap, links] = await Promise.all([
        tx.get(adminDb.doc(`${base(ctx)}/students/${studentId}`)),
        tx.get(adminDb.collection(`${base(ctx)}/studentGuardians`).where("studentId", "==", studentId)),
      ]);
      const link = links.docs.find((d) => d.id === linkId);
      if (!sSnap.exists || !link) throw new Error("MISSING");
      if (!hasCampus(ctx, sSnap.data().campusId)) throw new Error("DENIED");
      if (links.docs.length <= 1) throw new Error("LAST");
      if (link.data().isPrimary) throw new Error("PRIMARY");
      tx.delete(link.ref); // only the link; the guardian record may serve siblings
      auditInTx(tx, ctx.tenantId, { action: "GUARDIAN_UNLINKED", actorUid: ctx.user.uid, targetType: "student", targetId: studentId });
    });
  } catch (e) {
    return failFrom(e, MSG, "Could not remove the guardian.");
  }
  refresh(slug, studentId);
  return { ok: true, message: "Guardian unlinked." };
}
