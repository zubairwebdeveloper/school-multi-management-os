"use server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { getTeacherContext } from "@/lib/tenant/getTeacherContext";
import { getTenantTimezone } from "@/lib/tenant/getTimezone";
import { todayInZone } from "@/lib/utils/dates";
import { parseNested } from "@/lib/validations/students";
import { saveAttendanceSchema } from "@/lib/validations/attendance";
import { auditInTx } from "@/lib/audit/tenantAudit";

class UserError extends Error {}
const fail = (m) => { throw new UserError(m); };
const ts = () => FieldValue.serverTimestamp();

/**
 * Teacher attendance: TODAY only, and ONLY for sections where this teacher is the class teacher.
 * Authorization is derived from the section's classTeacherId, not from anything the client sends.
 * (Mirrors the dashboard transaction on purpose; past dates go through the correction workflow by an administrator.)
 */
export async function saveTeacherAttendance(slug, input) {
  const tc = await getTeacherContext(slug);
  const p = parseNested(saveAttendanceSchema, input);
  if (p.error) return p.error;
  const { sectionId, date, entries } = p.data;

  const today = todayInZone(await getTenantTimezone(tc.tenantId));
  if (date !== today) return { ok: false, error: "Teachers can only mark today's attendance. Ask an administrator to correct past dates." };

  const base = `tenants/${tc.tenantId}`;
  const byStudent = new Map(entries.map((e) => [e.studentId, e]));
  const dayRef = adminDb.doc(`${base}/attendanceDays/${sectionId}_${date}`);

  try {
    await adminDb.runTransaction(async (tx) => {
      const secSnap = await tx.get(adminDb.doc(`${base}/sections/${sectionId}`));
      if (!secSnap.exists) fail("Section not found.");
      const sec = secSnap.data();
      if (sec.status !== "ACTIVE" || sec.classTeacherId !== tc.employee.id) fail("You are not the class teacher of this section.");
      if (tc.campusIds.length && !tc.campusIds.includes(sec.campusId)) fail("You are not the class teacher of this section.");
      const sess = await tx.get(adminDb.doc(`${base}/academicSessions/${sec.sessionId}`));
      if (!sess.exists || sess.data().status !== "ACTIVE") fail("The academic session is not open.");
      if (date < sess.data().startDate || date > sess.data().endDate) fail("Today is outside the academic session.");

      const [roster, existing] = await Promise.all([
        tx.get(adminDb.collection(`${base}/students`).where("sectionId", "==", sectionId).where("status", "==", "ACTIVE")),
        tx.get(adminDb.collection(`${base}/studentAttendance`).where("sectionId", "==", sectionId).where("date", "==", date)),
      ]);
      const rosterIds = new Set(roster.docs.map((d) => d.id));
      for (const id of byStudent.keys()) if (!rosterIds.has(id)) fail("A student does not belong to this section.");

      const prior = new Map(existing.docs.map((d) => [d.data().studentId, d.data()]));
      const merged = new Map([...prior].map(([id, d]) => [id, d.status]));
      let changed = 0;
      for (const [studentId, e] of byStudent) {
        const old = prior.get(studentId);
        merged.set(studentId, e.status);
        if (old && old.status === e.status && (old.remark || "") === e.remark) continue;
        changed += 1;
        tx.set(adminDb.doc(`${base}/studentAttendance/${studentId}_${date}`), {
          tenantId: tc.tenantId, campusId: sec.campusId, sessionId: sec.sessionId, classId: sec.classId, sectionId,
          studentId, date, status: e.status, remark: e.remark, previousStatus: old ? old.status : null,
          source: "TEACHER", version: (old?.version || 0) + 1, editedAfterDay: false,
          markedBy: tc.user.uid, markedAt: old?.markedAt || ts(), updatedAt: ts(),
        });
      }
      if (!changed) return;

      const c = { PRESENT: 0, ABSENT: 0, LATE: 0, LEAVE: 0, HALF_DAY: 0 };
      for (const s of merged.values()) c[s] += 1;
      tx.set(dayRef, { tenantId: tc.tenantId, campusId: sec.campusId, sessionId: sec.sessionId, sectionId, date, counts: c, total: merged.size, rosterSize: rosterIds.size, submittedBy: tc.user.uid, updatedAt: ts() }, { merge: true });
      auditInTx(tx, tc.tenantId, { action: "ATTENDANCE_MARKED", actorUid: tc.user.uid, targetType: "attendanceDay", targetId: `${sectionId}_${date}`, meta: { sectionId, date, changed, via: "teacher-portal" } });
    });
  } catch (e) {
    return { ok: false, error: e instanceof UserError ? e.message : "Could not save attendance." };
  }
  revalidatePath(`/${slug}/teacher`, "layout");
  return { ok: true, message: "Attendance saved." };
}
