"use server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { DENIED, authorizeAction, hasCampus } from "@/lib/tenant/authorizeAction";
import { getTenantSettings } from "@/lib/tenant/getSettings";
import { PERMISSIONS as P } from "@/lib/permissions";
import { todayInZone } from "@/lib/utils/dates";
import { parseNested } from "@/lib/validations/students";
import { UserError, fail, parseTenths } from "@/lib/exams/core";
import { computeResults } from "@/lib/exams/compute";
import { auditInTx } from "@/lib/audit/tenantAudit";
import { notifyGuardiansOfStudents } from "@/lib/communications/notifyGuardians";

const base = (ctx) => `tenants/${ctx.tenantId}`;
const ts = () => FieldValue.serverTimestamp();
const col = (ctx, n) => adminDb.collection(`${base(ctx)}/${n}`);
const doc = (ctx, n, id) => adminDb.doc(`${base(ctx)}/${n}/${id}`);
const refresh = (slug) => revalidatePath(`/${slug}/dashboard/examinations`, "layout");
const MAX_STUDENTS = 300, MAX_MARK_DOCS = 6000;

function result(e, fallback) {
  if (e instanceof UserError) return { ok: false, error: e.message };
  if (e.message === "DENIED") return DENIED;
  return { ok: false, error: fallback };
}
const marksMap = (docs) => new Map(docs.map((d) => [`${d.data().studentId}_${d.data().subjectId}`, { obtained10: d.data().obtained10, absent: !!d.data().absent }]));

/**
 * Approves and publishes the results of a LOCKED exam. Marks, roster, ranking and the result documents are computed and
 * written in ONE transaction, so parents never see a half-published exam. After the commit, parents of the students are
 * notified (best-effort; a notification problem never undoes the publication).
 */
export async function publishExam(slug, examId) {
  const a = await authorizeAction(slug, { permission: P.RESULTS_APPROVE });
  if (a.error) return a.error;
  const { ctx } = a;
  const { timezone } = await getTenantSettings(ctx.tenantId);
  const today = todayInZone(timezone);
  const notify = [];
  let examName = "";

  try {
    await adminDb.runTransaction(async (tx) => {
      notify.length = 0; // the callback can retry
      const exSnap = await tx.get(doc(ctx, "exams", examId));
      if (!exSnap.exists) fail("Exam not found.");
      const ex = exSnap.data();
      if (!hasCampus(ctx, ex.campusId)) throw new Error("DENIED");
      if (ex.status !== "LOCKED") fail("Only a locked exam can be published.");
      examName = ex.name;

      const [studs, marks, secs] = await Promise.all([
        tx.get(col(ctx, "students").where("classId", "==", ex.classId).where("status", "==", "ACTIVE")),
        tx.get(col(ctx, "examMarks").where("examId", "==", examId)),
        tx.get(col(ctx, "sections").where("classId", "==", ex.classId).where("sessionId", "==", ex.sessionId)),
      ]);
      if (studs.size === 0) fail("There are no active students in this class.");
      if (studs.size > MAX_STUDENTS || marks.size > MAX_MARK_DOCS) fail("This class is too large to publish in one step. Contact support.");

      const out = computeResults({ exam: ex, students: studs.docs.map((s) => ({ id: s.id, sectionId: s.data().sectionId })), marks: marksMap(marks.docs) });
      if (out.missing) fail(`${out.missing} mark(s) are missing (for example a student admitted after locking). Reopen the exam and return the affected subjects.`);

      const secName = Object.fromEntries(secs.docs.map((s) => [s.id, s.data().name]));
      const stu = Object.fromEntries(studs.docs.map((s) => [s.id, s.data()]));
      for (const r of out.results) {
        const s = stu[r.studentId];
        notify.push({ studentId: r.studentId, name: `${s.firstName} ${s.lastName}` });
        tx.set(doc(ctx, "examResults", `${examId}_${r.studentId}`), {
          tenantId: ctx.tenantId, campusId: ex.campusId, examId, classId: ex.classId, sessionId: ex.sessionId,
          studentName: `${s.firstName} ${s.lastName}`, admissionNumber: s.admissionNumber, sectionName: secName[r.sectionId] || "",
          ...r, version: 1, publishedAt: ts(),
        });
      }
      tx.update(exSnap.ref, { status: "PUBLISHED", publishedBy: ctx.user.uid, publishedAt: ts(), publishedOn: today, classSize: out.results.length, updatedAt: ts() });
      auditInTx(tx, ctx.tenantId, { action: "RESULTS_PUBLISHED", actorUid: ctx.user.uid, targetType: "exam", targetId: examId, meta: { students: out.results.length } });
    });
  } catch (e) { return result(e, "Could not publish the results."); }

  const n = await notifyGuardiansOfStudents({
    tenantId: ctx.tenantId, type: "RESULT", keyPrefix: `result_${examId}`, flag: "resultAlerts",
    items: notify.map((s) => ({ studentId: s.studentId, title: `Results published: ${examName}`, body: `${s.name}'s result for ${examName} is now available. Open Results in the parent portal to see the report card.` })),
  });
  refresh(slug);
  const note = n.skipped ? " Parent alerts are switched off." : n.error ? " Parents could not be notified automatically." : ` ${n.created} parent notification(s) created${n.unreached ? `; ${n.unreached} student(s) have no parent with a portal login` : ""}.`;
  return { ok: true, message: `Results published.${note}` };
}

const correctionSchema = z.object({
  examId: z.string().min(1), studentId: z.string().min(1, "Select a student"), subjectId: z.string().min(1, "Select a subject"),
  status: z.enum(["PRESENT", "ABSENT"], { errorMap: () => ({ message: "Select a status" }) }),
  obtained: z.string().trim().max(8).default(""),
  reason: z.string().trim().min(5, "Explain why the mark is being corrected").max(300),
});

/**
 * Corrects ONE published mark. The old value, new value, reason and person are kept in examCorrections (never overwritten),
 * and every affected result and class/section position is recomputed in the same transaction.
 */
export async function correctMark(slug, input) {
  const a = await authorizeAction(slug, { permission: P.RESULTS_APPROVE });
  if (a.error) return a.error;
  const { ctx } = a;
  const p = parseNested(correctionSchema, input);
  if (p.error) return p.error;
  const { examId, studentId, subjectId, status, obtained, reason } = p.data;
  const histRef = col(ctx, "examCorrections").doc();

  try {
    await adminDb.runTransaction(async (tx) => {
      const exSnap = await tx.get(doc(ctx, "exams", examId));
      if (!exSnap.exists) fail("Exam not found.");
      const ex = exSnap.data();
      if (!hasCampus(ctx, ex.campusId)) throw new Error("DENIED");
      if (ex.status !== "PUBLISHED") fail("Only published results are corrected this way.");
      const sub = ex.subjects.find((s) => s.subjectId === subjectId);
      if (!sub) fail("That subject is not part of this exam.");

      const [results, marks] = await Promise.all([
        tx.get(col(ctx, "examResults").where("examId", "==", examId)),
        tx.get(col(ctx, "examMarks").where("examId", "==", examId)),
      ]);
      const target = results.docs.find((d) => d.data().studentId === studentId);
      const markDoc = marks.docs.find((d) => d.data().studentId === studentId && d.data().subjectId === subjectId);
      if (!target || !markDoc) fail("That student's result was not found.");

      const absent = status === "ABSENT";
      let obtained10 = null;
      if (!absent) {
        obtained10 = parseTenths(obtained);
        if (obtained10 === null || obtained10 > sub.total * 10) fail(`Marks must be a number from 0 to ${sub.total} (one decimal at most).`);
      }
      const before = { obtained10: markDoc.data().obtained10 ?? null, absent: !!markDoc.data().absent };
      if (before.absent === absent && before.obtained10 === obtained10) fail("The mark is unchanged.");

      const map = marksMap(marks.docs);
      map.set(`${studentId}_${subjectId}`, { obtained10, absent });
      const out = computeResults({ exam: ex, students: results.docs.map((d) => ({ id: d.data().studentId, sectionId: d.data().sectionId })), marks: map });
      if (out.missing) fail("Marks are incomplete for this exam.");

      const byStudent = Object.fromEntries(out.results.map((r) => [r.studentId, r]));
      let changed = 0;
      for (const d of results.docs) {
        const n = byStudent[d.data().studentId], o = d.data();
        const same = o.totalObtained10 === n.totalObtained10 && o.classPosition === n.classPosition && o.sectionPosition === n.sectionPosition
          && o.grade === n.grade && o.result === n.result && JSON.stringify(o.subjects) === JSON.stringify(n.subjects);
        if (same) continue;
        const { studentId: _s, sectionId: _x, ...fields } = n;
        tx.update(d.ref, { ...fields, version: (o.version || 1) + 1, correctedAt: ts() });
        changed += 1;
      }
      tx.update(markDoc.ref, { obtained10, absent, correctedBy: ctx.user.uid, correctedAt: ts(), updatedAt: ts() });
      tx.set(histRef, {
        tenantId: ctx.tenantId, campusId: ex.campusId, examId, studentId, subjectId, subjectName: sub.name,
        before, after: { obtained10, absent }, reason, correctedBy: ctx.user.uid, correctedByEmail: ctx.user.email, createdAt: ts(),
      });
      auditInTx(tx, ctx.tenantId, { action: "RESULT_MARK_CORRECTED", actorUid: ctx.user.uid, targetType: "exam", targetId: examId, meta: { studentId, subjectId, resultsUpdated: changed } });
    });
  } catch (e) { return result(e, "Could not correct the mark."); }
  refresh(slug);
  revalidatePath(`/${slug}/parent`, "layout");
  return { ok: true, message: "Mark corrected. Results and positions were recalculated; the change is on record." };
}
