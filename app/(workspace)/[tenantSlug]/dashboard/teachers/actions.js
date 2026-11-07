"use server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { DENIED, authorizeAction, failFrom, hasCampus } from "@/lib/tenant/authorizeAction";
import { getTenantTimezone } from "@/lib/tenant/getTimezone";
import { PERMISSIONS as P } from "@/lib/permissions";
import { todayInZone } from "@/lib/utils/dates";
import { parseNested } from "@/lib/validations/students";
import {
  assignSchema, classTeacherSchema, departmentSchema, employeeCreateSchema,
  employeeDetailsSchema, employeeStatusSchema,
} from "@/lib/validations/staff";
import { auditInTx } from "@/lib/audit/tenantAudit";

const base = (ctx) => `tenants/${ctx.tenantId}`;
const ts = () => FieldValue.serverTimestamp();
const refresh = (slug) => revalidatePath(`/${slug}/dashboard/teachers`, "layout");
const manageStaff = (slug, extra = {}) => authorizeAction(slug, { permission: P.STAFF_MANAGE, ...extra });

const MSG = {
  MISSING: "Record not found.", DENIED: DENIED.error,
  NAME: "That name is already used.", CODE: "That code is already used.",
  DEPT: "Choose an active department.", FUTURE: "The joining date cannot be in the future.",
  SECTION: "Choose an active section in an open session.", SUBJECT: "Choose an active subject that matches the class curriculum.",
  TEACHER: "Choose an active teaching staff member from the same campus as the section.",
  INACTIVE: "This staff member is not active.", SAME: "The status is already set.",
  HAS_STAFF: "Move the department's active staff first.", CT_BUSY: "That teacher is already class teacher of another section in this session.",
};

// ---------------- departments ----------------
export async function createDepartment(slug, input) {
  const a = await manageStaff(slug, { requireOrgWide: true });
  if (a.error) return a.error;
  const { ctx } = a;
  const p = parseNested(departmentSchema, input);
  if (p.error) return p.error;
  const col = adminDb.collection(`${base(ctx)}/departments`);
  const ref = col.doc();
  try {
    await adminDb.runTransaction(async (tx) => {
      const all = (await tx.get(col)).docs.map((d) => d.data());
      if (all.some((d) => d.name.toLowerCase() === p.data.name.toLowerCase())) throw new Error("NAME");
      if (p.data.code && all.some((d) => d.code === p.data.code)) throw new Error("CODE");
      tx.set(ref, { tenantId: ctx.tenantId, ...p.data, status: "ACTIVE", createdBy: ctx.user.uid, createdAt: ts(), updatedAt: ts() });
      auditInTx(tx, ctx.tenantId, { action: "DEPARTMENT_CREATED", actorUid: ctx.user.uid, targetType: "department", targetId: ref.id });
    });
  } catch (e) { return failFrom(e, MSG, "Could not create the department."); }
  refresh(slug);
  return { ok: true, message: "Department created." };
}

export async function updateDepartment(slug, departmentId, input) {
  const a = await manageStaff(slug, { requireOrgWide: true });
  if (a.error) return a.error;
  const { ctx } = a;
  const p = parseNested(departmentSchema, input);
  if (p.error) return p.error;
  const col = adminDb.collection(`${base(ctx)}/departments`);
  try {
    await adminDb.runTransaction(async (tx) => {
      const docs = (await tx.get(col)).docs;
      const cur = docs.find((d) => d.id === departmentId);
      if (!cur) throw new Error("MISSING");
      const others = docs.filter((d) => d.id !== departmentId).map((d) => d.data());
      if (others.some((d) => d.name.toLowerCase() === p.data.name.toLowerCase())) throw new Error("NAME");
      if (p.data.code && others.some((d) => d.code === p.data.code)) throw new Error("CODE");
      const changedFields = Object.keys(p.data).filter((k) => (cur.data()[k] ?? "") !== p.data[k]);
      if (!changedFields.length) return;
      tx.update(cur.ref, { ...p.data, updatedBy: ctx.user.uid, updatedAt: ts() });
      auditInTx(tx, ctx.tenantId, { action: "DEPARTMENT_UPDATED", actorUid: ctx.user.uid, targetType: "department", targetId: departmentId, changedFields });
    });
  } catch (e) { return failFrom(e, MSG, "Could not save changes."); }
  refresh(slug);
  return { ok: true, message: "Department updated." };
}

export async function setDepartmentStatus(slug, departmentId, status) {
  const a = await manageStaff(slug, { requireOrgWide: true });
  if (a.error) return a.error;
  const { ctx } = a;
  if (!["ACTIVE", "ARCHIVED"].includes(status)) return { ok: false, error: "Invalid status." };
  if (status === "ARCHIVED") {
    const n = await adminDb.collection(`${base(ctx)}/employees`).where("departmentId", "==", departmentId).where("status", "==", "ACTIVE").count().get();
    if (n.data().count > 0) return { ok: false, error: MSG.HAS_STAFF };
  }
  const ref = adminDb.doc(`${base(ctx)}/departments/${departmentId}`);
  try {
    await adminDb.runTransaction(async (tx) => {
      const s = await tx.get(ref);
      if (!s.exists) throw new Error("MISSING");
      tx.update(ref, { status, updatedBy: ctx.user.uid, updatedAt: ts() });
      auditInTx(tx, ctx.tenantId, { action: status === "ARCHIVED" ? "DEPARTMENT_ARCHIVED" : "DEPARTMENT_RESTORED", actorUid: ctx.user.uid, targetType: "department", targetId: departmentId, changedFields: ["status"] });
    });
  } catch (e) { return failFrom(e, MSG, "Could not change the status."); }
  refresh(slug);
  return { ok: true, message: status === "ARCHIVED" ? "Department archived." : "Department restored." };
}

// ---------------- employees ----------------
async function checkDepartment(tx, ctx, departmentId) {
  if (!departmentId) return;
  const d = await tx.get(adminDb.doc(`${base(ctx)}/departments/${departmentId}`));
  if (!d.exists || d.data().status !== "ACTIVE") throw new Error("DEPT");
}

export async function createEmployee(slug, input) {
  const a = await manageStaff(slug);
  if (a.error) return a.error;
  const { ctx } = a;
  const p = parseNested(employeeCreateSchema, input);
  if (p.error) return p.error;
  const { campusId, ...details } = p.data;
  if (!hasCampus(ctx, campusId)) return DENIED;
  if (details.joinDate > todayInZone(await getTenantTimezone(ctx.tenantId))) return { ok: false, error: MSG.FUTURE, fieldErrors: { joinDate: [MSG.FUTURE] } };

  const ref = adminDb.collection(`${base(ctx)}/employees`).doc();
  const counterRef = adminDb.doc(`${base(ctx)}/counters/staffId`);
  try {
    await adminDb.runTransaction(async (tx) => {
      const counter = await tx.get(counterRef);
      await checkDepartment(tx, ctx, details.departmentId);
      const n = counter.exists ? counter.data().next : 1;
      const staffId = `STF-${String(n).padStart(5, "0")}`;
      tx.set(counterRef, { next: n + 1, updatedAt: ts() });
      tx.set(ref, {
        tenantId: ctx.tenantId, campusId, staffId, ...details,
        nameLower: `${details.firstName} ${details.lastName}`.toLowerCase(),
        status: "ACTIVE", linkedUid: null, createdBy: ctx.user.uid, createdAt: ts(), updatedAt: ts(),
      });
      auditInTx(tx, ctx.tenantId, { action: "EMPLOYEE_CREATED", actorUid: ctx.user.uid, targetType: "employee", targetId: ref.id, meta: { campusId, staffId } });
    });
  } catch (e) { return failFrom(e, MSG, "Could not add the staff member."); }
  refresh(slug);
  return { ok: true, id: ref.id, message: "Staff member added." };
}

export async function updateEmployee(slug, employeeId, input) {
  const a = await manageStaff(slug);
  if (a.error) return a.error;
  const { ctx } = a;
  const p = parseNested(employeeDetailsSchema, input);
  if (p.error) return p.error;
  const data = p.data;
  const ref = adminDb.doc(`${base(ctx)}/employees/${employeeId}`);
  try {
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("MISSING");
      const cur = snap.data();
      if (!hasCampus(ctx, cur.campusId)) throw new Error("DENIED");
      await checkDepartment(tx, ctx, data.departmentId === cur.departmentId ? "" : data.departmentId);
      // Switching a teacher to non-teaching would orphan their classes; end those first.
      if (cur.staffType === "TEACHING" && data.staffType !== "TEACHING") {
        const open = await tx.get(adminDb.collection(`${base(ctx)}/teachingAssignments`).where("employeeId", "==", employeeId).limit(1));
        if (!open.empty) throw new Error("TEACHER");
      }
      const changedFields = Object.keys(data).filter((k) => (cur[k] ?? "") !== data[k]);
      if (!changedFields.length) return;
      tx.update(ref, { ...data, nameLower: `${data.firstName} ${data.lastName}`.toLowerCase(), updatedBy: ctx.user.uid, updatedAt: ts() });
      auditInTx(tx, ctx.tenantId, { action: "EMPLOYEE_UPDATED", actorUid: ctx.user.uid, targetType: "employee", targetId: employeeId, changedFields });
    });
  } catch (e) {
    if (e.message === "DENIED") return DENIED;
    return failFrom({ message: e.message === "TEACHER" ? "TEACHER_ASSIGNED" : e.message }, { ...MSG, TEACHER_ASSIGNED: "Remove this teacher's subject assignments before changing the staff type." }, "Could not save changes.");
  }
  refresh(slug);
  return { ok: true, message: "Staff member updated." };
}

export async function setEmployeeStatus(slug, employeeId, input) {
  const a = await manageStaff(slug);
  if (a.error) return a.error;
  const { ctx } = a;
  const p = parseNested(employeeStatusSchema, input);
  if (p.error) return p.error;
  const { status, reason } = p.data;
  const ref = adminDb.doc(`${base(ctx)}/employees/${employeeId}`);
  try {
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("MISSING");
      const cur = snap.data();
      if (!hasCampus(ctx, cur.campusId)) throw new Error("DENIED");
      if (cur.status === status) throw new Error("SAME");

      let released = 0;
      if (status === "INACTIVE") {
        // Free everything this person held so no section keeps an inactive teacher.
        const [assigns, ctSections] = await Promise.all([
          tx.get(adminDb.collection(`${base(ctx)}/teachingAssignments`).where("employeeId", "==", employeeId)),
          tx.get(adminDb.collection(`${base(ctx)}/sections`).where("classTeacherId", "==", employeeId)),
        ]);
        assigns.docs.forEach((d) => tx.delete(d.ref));
        ctSections.docs.forEach((d) => tx.update(d.ref, { classTeacherId: null, updatedAt: ts() }));
        released = assigns.size + ctSections.size;
      }
      tx.update(ref, { status, statusReason: reason, statusChangedAt: ts(), updatedBy: ctx.user.uid, updatedAt: ts() });
      auditInTx(tx, ctx.tenantId, { action: status === "ACTIVE" ? "EMPLOYEE_REACTIVATED" : "EMPLOYEE_DEACTIVATED", actorUid: ctx.user.uid, targetType: "employee", targetId: employeeId, changedFields: ["status"], meta: { released } });
    });
  } catch (e) {
    if (e.message === "DENIED") return DENIED;
    return failFrom(e, MSG, "Could not change the status.");
  }
  refresh(slug);
  return { ok: true, message: status === "ACTIVE" ? "Staff member reactivated." : "Staff member deactivated and released from classes." };
}

// ---------------- teaching assignments ----------------
const assignAuth = (slug) => authorizeAction(slug, { permission: [P.STAFF_MANAGE, P.ACADEMICS_MANAGE] });

async function loadOpenSection(tx, ctx, sectionId) {
  const secSnap = await tx.get(adminDb.doc(`${base(ctx)}/sections/${sectionId}`));
  if (!secSnap.exists || secSnap.data().status !== "ACTIVE") throw new Error("SECTION");
  const sec = secSnap.data();
  if (!hasCampus(ctx, sec.campusId)) throw new Error("DENIED");
  const [sess, cls] = await Promise.all([
    tx.get(adminDb.doc(`${base(ctx)}/academicSessions/${sec.sessionId}`)),
    tx.get(adminDb.doc(`${base(ctx)}/classes/${sec.classId}`)),
  ]);
  if (!sess.exists || sess.data().status === "CLOSED" || !cls.exists) throw new Error("SECTION");
  return { sec, cls: cls.data(), secRef: secSnap.ref };
}

async function loadTeacher(tx, ctx, employeeId, campusId) {
  const t = await tx.get(adminDb.doc(`${base(ctx)}/employees/${employeeId}`));
  const d = t.data();
  if (!t.exists || d.status !== "ACTIVE" || d.staffType !== "TEACHING" || d.campusId !== campusId) throw new Error("TEACHER");
  return d;
}

export async function assignTeacher(slug, input) {
  const a = await assignAuth(slug);
  if (a.error) return a.error;
  const { ctx } = a;
  const p = parseNested(assignSchema, input);
  if (p.error) return p.error;
  const { sectionId, subjectId, employeeId } = p.data;
  const ref = adminDb.doc(`${base(ctx)}/teachingAssignments/${sectionId}_${subjectId}`); // one teacher per subject per section
  try {
    await adminDb.runTransaction(async (tx) => {
      const { sec, cls } = await loadOpenSection(tx, ctx, sectionId);
      const [subj, existing] = await Promise.all([tx.get(adminDb.doc(`${base(ctx)}/subjects/${subjectId}`)), tx.get(ref)]);
      if (!subj.exists || subj.data().status !== "ACTIVE" || !["ALL", cls.curriculum].includes(subj.data().curriculum)) throw new Error("SUBJECT");
      await loadTeacher(tx, ctx, employeeId, sec.campusId);
      if (existing.exists && existing.data().employeeId === employeeId) return;
      tx.set(ref, {
        tenantId: ctx.tenantId, campusId: sec.campusId, sessionId: sec.sessionId, classId: sec.classId,
        sectionId, subjectId, employeeId, previousEmployeeId: existing.exists ? existing.data().employeeId : null,
        assignedBy: ctx.user.uid, createdAt: existing.exists ? existing.data().createdAt : ts(), updatedAt: ts(),
      });
      auditInTx(tx, ctx.tenantId, { action: existing.exists ? "TEACHER_REASSIGNED" : "TEACHER_ASSIGNED", actorUid: ctx.user.uid, targetType: "teachingAssignment", targetId: ref.id, meta: { sectionId, subjectId } });
    });
  } catch (e) {
    if (e.message === "DENIED") return DENIED;
    return failFrom(e, MSG, "Could not assign the teacher.");
  }
  refresh(slug);
  return { ok: true, message: "Teacher assigned." };
}

export async function removeAssignment(slug, input) {
  const a = await assignAuth(slug);
  if (a.error) return a.error;
  const { ctx } = a;
  const { sectionId, subjectId } = input || {};
  if (!sectionId || !subjectId) return { ok: false, error: "Invalid request." };
  const ref = adminDb.doc(`${base(ctx)}/teachingAssignments/${sectionId}_${subjectId}`);
  try {
    await adminDb.runTransaction(async (tx) => {
      const [snap, sec] = await Promise.all([tx.get(ref), tx.get(adminDb.doc(`${base(ctx)}/sections/${sectionId}`))]);
      if (!snap.exists || !sec.exists) throw new Error("MISSING");
      if (!hasCampus(ctx, sec.data().campusId)) throw new Error("DENIED");
      tx.delete(ref);
      auditInTx(tx, ctx.tenantId, { action: "TEACHER_UNASSIGNED", actorUid: ctx.user.uid, targetType: "teachingAssignment", targetId: ref.id, meta: { sectionId, subjectId } });
    });
  } catch (e) {
    if (e.message === "DENIED") return DENIED;
    return failFrom(e, MSG, "Could not remove the assignment.");
  }
  refresh(slug);
  return { ok: true, message: "Assignment removed." };
}

export async function setClassTeacher(slug, input) {
  const a = await assignAuth(slug);
  if (a.error) return a.error;
  const { ctx } = a;
  const p = parseNested(classTeacherSchema, input);
  if (p.error) return p.error;
  const { sectionId, employeeId } = p.data;
  try {
    await adminDb.runTransaction(async (tx) => {
      const { sec, secRef } = await loadOpenSection(tx, ctx, sectionId);
      if (employeeId) {
        await loadTeacher(tx, ctx, employeeId, sec.campusId);
        const busy = await tx.get(adminDb.collection(`${base(ctx)}/sections`).where("classTeacherId", "==", employeeId).where("sessionId", "==", sec.sessionId));
        if (busy.docs.some((d) => d.id !== sectionId)) throw new Error("CT_BUSY");
      }
      if ((sec.classTeacherId || "") === employeeId) return;
      tx.update(secRef, { classTeacherId: employeeId || null, updatedBy: ctx.user.uid, updatedAt: ts() });
      auditInTx(tx, ctx.tenantId, { action: "CLASS_TEACHER_SET", actorUid: ctx.user.uid, targetType: "section", targetId: sectionId, changedFields: ["classTeacherId"] });
    });
  } catch (e) {
    if (e.message === "DENIED") return DENIED;
    return failFrom(e, MSG, "Could not set the class teacher.");
  }
  refresh(slug);
  return { ok: true, message: employeeId ? "Class teacher set." : "Class teacher cleared." };
}
