"use server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { DENIED, authorizeAction, failFrom, hasCampus } from "@/lib/tenant/authorizeAction";
import { getTenantTimezone } from "@/lib/tenant/getTimezone";
import { PERMISSIONS as P } from "@/lib/permissions";
import { addDays, todayInZone } from "@/lib/utils/dates";
import { parseNested } from "@/lib/validations/students";
import {
  MAX_BACKDATE_DAYS, correctionRequestSchema, reviewSchema, saveAttendanceSchema,
} from "@/lib/validations/attendance";
import { auditInTx } from "@/lib/audit/tenantAudit";
import { notifyGuardiansOfStudents } from "@/lib/communications/notifyGuardians";

const base = (ctx) => `tenants/${ctx.tenantId}`;
const ts = () => FieldValue.serverTimestamp();
const refresh = (slug) => revalidatePath(`/${slug}/dashboard/attendance`, "layout");

const MSG = {
  MISSING: "Record not found.", DENIED: DENIED.error,
  SECTION: "Choose an active section.", SESSION: "The academic session is not open for this date.",
  RANGE: "This date is outside the academic session.", STUDENT: "A student does not belong to this section.",
  DONE: "This request has already been decided.", SELF: "You cannot review your own request.",
  SAME: "The new status is the same as the current one.", PENDING: "A correction for this student and date is already pending.",
};

function counts(statusByStudent) {
  const c = { PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0, HALF_DAY: 0 };
  for (const s of statusByStudent.values()) c[s] += 1;
  return c;
}

/** Validates an open section and that `date` falls inside its session. */
async function loadSection(tx, ctx, sectionId, date) {
  const secSnap = await tx.get(adminDb.doc(`${base(ctx)}/sections/${sectionId}`));
  if (!secSnap.exists || secSnap.data().status !== "ACTIVE") throw new Error("SECTION");
  const sec = secSnap.data();
  if (!hasCampus(ctx, sec.campusId)) throw new Error("DENIED");
  const sessSnap = await tx.get(adminDb.doc(`${base(ctx)}/academicSessions/${sec.sessionId}`));
  if (!sessSnap.exists || sessSnap.data().status === "CLOSED") throw new Error("SESSION");
  const s = sessSnap.data();
  if (date < s.startDate || date > s.endDate) throw new Error("RANGE");
  return sec;
}

export async function saveSectionAttendance(slug, input) {
  const a = await authorizeAction(slug, { permission: [P.ATTENDANCE_MARK, P.ATTENDANCE_APPROVE] });
  if (a.error) return a.error;
  const { ctx } = a;
  const p = parseNested(saveAttendanceSchema, input);
  if (p.error) return p.error;
  const { sectionId, date, entries } = p.data;

  const today = todayInZone(await getTenantTimezone(ctx.tenantId));
  if (date > today) return { ok: false, error: "Attendance cannot be marked for a future date." };
  const past = date < today;
  if (past) {
    // Past days are corrections: only approvers may change them directly, inside the backdate window.
    if (!ctx.permissions.includes(P.ATTENDANCE_APPROVE)) return { ok: false, error: "Past dates need a correction request." };
    if (date < addDays(today, -MAX_BACKDATE_DAYS)) return { ok: false, error: `Attendance older than ${MAX_BACKDATE_DAYS} days is locked.` };
  } else if (!ctx.permissions.includes(P.ATTENDANCE_MARK)) {
    return DENIED;
  }

  const byStudent = new Map(entries.map((e) => [e.studentId, e])); // last entry wins
  const dayRef = adminDb.doc(`${base(ctx)}/attendanceDays/${sectionId}_${date}`);
  const newlyAbsent = [];

  try {
    await adminDb.runTransaction(async (tx) => {
      newlyAbsent.length = 0; // the callback can retry
      const sec = await loadSection(tx, ctx, sectionId, date);
      const [roster, existing] = await Promise.all([
        tx.get(adminDb.collection(`${base(ctx)}/students`).where("sectionId", "==", sectionId).where("status", "==", "ACTIVE")),
        tx.get(adminDb.collection(`${base(ctx)}/studentAttendance`).where("sectionId", "==", sectionId).where("date", "==", date)),
      ]);
      const rosterIds = new Set(roster.docs.map((d) => d.id));
      const nameOf = Object.fromEntries(roster.docs.map((d) => [d.id, `${d.data().firstName} ${d.data().lastName}`]));
      for (const id of byStudent.keys()) if (!rosterIds.has(id)) throw new Error("STUDENT");

      const prior = new Map(existing.docs.map((d) => [d.data().studentId, d.data()]));
      const merged = new Map([...prior].map(([id, d]) => [id, d.status]));
      let changed = 0;

      for (const [studentId, e] of byStudent) {
        const old = prior.get(studentId);
        if (old && old.status === e.status && (old.remark || "") === e.remark) { merged.set(studentId, e.status); continue; }
        changed += 1;
        merged.set(studentId, e.status);
        if (e.status === "ABSENT" && old?.status !== "ABSENT") newlyAbsent.push({ studentId, name: nameOf[studentId] });
        tx.set(adminDb.doc(`${base(ctx)}/studentAttendance/${studentId}_${date}`), {
          tenantId: ctx.tenantId, campusId: sec.campusId, sessionId: sec.sessionId, classId: sec.classId, sectionId,
          studentId, date, status: e.status, remark: e.remark,
          previousStatus: old ? old.status : null,
          source: "MANUAL", version: (old?.version || 0) + 1,
          editedAfterDay: past, markedBy: ctx.user.uid, markedAt: old?.markedAt || ts(), updatedAt: ts(),
        });
      }
      if (!changed) return;

      tx.set(dayRef, {
        tenantId: ctx.tenantId, campusId: sec.campusId, sessionId: sec.sessionId, sectionId, date,
        counts: counts(merged), total: merged.size, rosterSize: rosterIds.size,
        submittedBy: ctx.user.uid, updatedAt: ts(),
      }, { merge: true });
      auditInTx(tx, ctx.tenantId, {
        action: past ? "ATTENDANCE_EDITED_PAST" : "ATTENDANCE_MARKED", actorUid: ctx.user.uid,
        targetType: "attendanceDay", targetId: `${sectionId}_${date}`, meta: { sectionId, date, changed },
      });
    });
  } catch (e) {
    if (e.message === "DENIED") return DENIED;
    return failFrom(e, MSG, "Could not save attendance.");
  }

  // Absence alerts: only for TODAY (a late alert about an old day would confuse parents). Best-effort: never undoes the save.
  if (!past && newlyAbsent.length) {
    await notifyGuardiansOfStudents({
      tenantId: ctx.tenantId, type: "ABSENCE", keyPrefix: `absent_${date}`, flag: "absenceAlerts",
      items: newlyAbsent.map((s) => ({ studentId: s.studentId, title: "Absence notice", body: `${s.name} was marked absent today (${date}). If this is a mistake, please contact the school.` })),
    });
  }
  refresh(slug);
  return { ok: true, message: "Attendance saved." };
}

export async function requestCorrection(slug, input) {
  const a = await authorizeAction(slug, { permission: P.ATTENDANCE_MARK });
  if (a.error) return a.error;
  const { ctx } = a;
  const p = parseNested(correctionRequestSchema, input);
  if (p.error) return p.error;
  const { sectionId, studentId, date, status, reason } = p.data;

  const today = todayInZone(await getTenantTimezone(ctx.tenantId));
  if (date >= today) return { ok: false, error: "Corrections are for past dates. Mark today's attendance directly." };
  if (date < addDays(today, -MAX_BACKDATE_DAYS)) return { ok: false, error: `Attendance older than ${MAX_BACKDATE_DAYS} days is locked.` };

  const ref = adminDb.collection(`${base(ctx)}/attendanceCorrections`).doc();
  try {
    await adminDb.runTransaction(async (tx) => {
      const sec = await loadSection(tx, ctx, sectionId, date);
      const [stuSnap, curSnap, pending] = await Promise.all([
        tx.get(adminDb.doc(`${base(ctx)}/students/${studentId}`)),
        tx.get(adminDb.doc(`${base(ctx)}/studentAttendance/${studentId}_${date}`)),
        tx.get(adminDb.collection(`${base(ctx)}/attendanceCorrections`)
          .where("studentId", "==", studentId).where("date", "==", date).where("status", "==", "PENDING")),
      ]);
      if (!stuSnap.exists || stuSnap.data().sectionId !== sectionId) throw new Error("STUDENT");
      if (!pending.empty) throw new Error("PENDING");
      const from = curSnap.exists ? curSnap.data().status : null;
      if (from === status) throw new Error("SAME");

      tx.set(ref, {
        tenantId: ctx.tenantId, campusId: sec.campusId, sessionId: sec.sessionId, classId: sec.classId, sectionId,
        studentId, date, fromStatus: from, toStatus: status, reason, status: "PENDING",
        requestedBy: ctx.user.uid, createdAt: ts(),
      });
      auditInTx(tx, ctx.tenantId, { action: "ATTENDANCE_CORRECTION_REQUESTED", actorUid: ctx.user.uid, targetType: "attendanceCorrection", targetId: ref.id });
    });
  } catch (e) {
    if (e.message === "DENIED") return DENIED;
    return failFrom(e, MSG, "Could not submit the request.");
  }
  refresh(slug);
  return { ok: true, message: "Correction request sent for approval." };
}

export async function reviewCorrection(slug, correctionId, input) {
  const a = await authorizeAction(slug, { permission: P.ATTENDANCE_APPROVE });
  if (a.error) return a.error;
  const { ctx } = a;
  const p = parseNested(reviewSchema, input);
  if (p.error) return p.error;
  const { decision, note } = p.data;

  const ref = adminDb.doc(`${base(ctx)}/attendanceCorrections/${correctionId}`);
  try {
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("MISSING");
      const c = snap.data();
      if (c.status !== "PENDING") throw new Error("DONE");
      if (!hasCampus(ctx, c.campusId)) throw new Error("DENIED");
      if (c.requestedBy === ctx.user.uid) throw new Error("SELF"); // separation of duties

      if (decision === "APPROVED") {
        const dayRef = adminDb.doc(`${base(ctx)}/attendanceDays/${c.sectionId}_${c.date}`);
        const attRef = adminDb.doc(`${base(ctx)}/studentAttendance/${c.studentId}_${c.date}`);
        const [dayDocs, curSnap] = await Promise.all([
          tx.get(adminDb.collection(`${base(ctx)}/studentAttendance`).where("sectionId", "==", c.sectionId).where("date", "==", c.date)),
          tx.get(attRef),
        ]);
        const merged = new Map(dayDocs.docs.map((d) => [d.data().studentId, d.data().status]));
        merged.set(c.studentId, c.toStatus);

        tx.set(attRef, {
          tenantId: ctx.tenantId, campusId: c.campusId, sessionId: c.sessionId, classId: c.classId, sectionId: c.sectionId,
          studentId: c.studentId, date: c.date, status: c.toStatus, remark: c.reason,
          previousStatus: curSnap.exists ? curSnap.data().status : null, source: "CORRECTION", correctionId,
          version: (curSnap.data()?.version || 0) + 1, editedAfterDay: true,
          markedBy: curSnap.data()?.markedBy || c.requestedBy, markedAt: curSnap.data()?.markedAt || ts(), updatedAt: ts(),
        });
        tx.set(dayRef, {
          tenantId: ctx.tenantId, campusId: c.campusId, sessionId: c.sessionId, sectionId: c.sectionId, date: c.date,
          counts: counts(merged), total: merged.size, updatedAt: ts(),
        }, { merge: true });
      }
      tx.update(ref, { status: decision, reviewedBy: ctx.user.uid, reviewNote: note, reviewedAt: ts() });
      auditInTx(tx, ctx.tenantId, {
        action: decision === "APPROVED" ? "ATTENDANCE_CORRECTION_APPROVED" : "ATTENDANCE_CORRECTION_REJECTED",
        actorUid: ctx.user.uid, targetType: "attendanceCorrection", targetId: correctionId,
      });
    });
  } catch (e) {
    if (e.message === "DENIED") return DENIED;
    return failFrom(e, MSG, "Could not review the request.");
  }
  refresh(slug);
  return { ok: true, message: decision === "APPROVED" ? "Correction approved and applied." : "Correction rejected." };
}
