import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { auditInTx } from "@/lib/audit/tenantAudit";

export class UserError extends Error {}
export const fail = (m) => { throw new UserError(m); };

/** Marks are stored as integer TENTHS (45.5 -> 455) so sums and percentages are exact. */
export function parseTenths(s) {
  const m = /^(\d{1,4})(?:\.(\d))?$/.exec(String(s ?? "").trim());
  return m ? Number(m[1]) * 10 + Number(m[2] || 0) : null;
}
export const tenthsText = (n) => (n == null ? "" : n % 10 === 0 ? String(n / 10) : (n / 10).toFixed(1));

const ts = () => FieldValue.serverTimestamp();

/**
 * Saves (and optionally submits) marks for ONE exam + section + subject, in one transaction.
 * The caller supplies `authorize({exam, section})`, which must throw (UserError) when the caller may not
 * enter marks here. Everything else (exam open, class/section/session consistency, roster membership,
 * ranges, submission state) is enforced here for every surface (teacher portal and dashboard alike).
 */
export async function runSaveMarks({ tenantId, uid, input, authorize }) {
  const { examId, sectionId, subjectId, entries, submit } = input;
  const base = `tenants/${tenantId}`;

  await adminDb.runTransaction(async (tx) => {
    const [examSnap, secSnap] = await Promise.all([
      tx.get(adminDb.doc(`${base}/exams/${examId}`)),
      tx.get(adminDb.doc(`${base}/sections/${sectionId}`)),
    ]);
    if (!examSnap.exists) fail("Exam not found.");
    const exam = examSnap.data();
    if (exam.status !== "OPEN") fail("Marks entry is not open for this exam.");
    const subj = exam.subjects.find((s) => s.subjectId === subjectId);
    if (!subj) fail("That subject is not part of this exam.");
    if (!secSnap.exists) fail("Section not found.");
    const section = secSnap.data();
    if (section.status !== "ACTIVE" || section.classId !== exam.classId || section.sessionId !== exam.sessionId) fail("That section does not belong to this exam.");
    await authorize({ exam, section });

    const subRef = adminDb.doc(`${base}/examSubmissions/${examId}_${sectionId}_${subjectId}`);
    const [subSnap, roster, existing] = await Promise.all([
      tx.get(subRef),
      tx.get(adminDb.collection(`${base}/students`).where("sectionId", "==", sectionId).where("status", "==", "ACTIVE")),
      tx.get(adminDb.collection(`${base}/examMarks`).where("examId", "==", examId).where("sectionId", "==", sectionId).where("subjectId", "==", subjectId)),
    ]);
    if (subSnap.exists && ["SUBMITTED", "VERIFIED"].includes(subSnap.data().status)) fail("These marks are already submitted. Ask a reviewer to return them for correction.");

    const rosterIds = new Set(roster.docs.map((d) => d.id));
    const byStudent = new Map(entries.map((e) => [e.studentId, e]));
    for (const id of byStudent.keys()) if (!rosterIds.has(id)) fail("A student does not belong to this section.");

    const filled = new Set(existing.docs.map((d) => d.data().studentId));
    const had = new Set(filled);
    let changed = 0;
    for (const [studentId, e] of byStudent) {
      const ref = adminDb.doc(`${base}/examMarks/${examId}_${studentId}_${subjectId}`);
      const raw = e.obtained.trim();
      if (e.absent) {
        tx.set(ref, { tenantId, campusId: exam.campusId, examId, classId: exam.classId, sectionId, studentId, subjectId, obtained10: null, absent: true, enteredBy: uid, updatedAt: ts() });
        filled.add(studentId); changed += 1;
      } else if (raw === "") {
        if (had.has(studentId)) { tx.delete(ref); changed += 1; }
        filled.delete(studentId);
      } else {
        const v = parseTenths(raw);
        if (v === null || v > subj.total * 10) fail(`Marks must be a number from 0 to ${subj.total} (one decimal at most).`);
        tx.set(ref, { tenantId, campusId: exam.campusId, examId, classId: exam.classId, sectionId, studentId, subjectId, obtained10: v, absent: false, enteredBy: uid, updatedAt: ts() });
        filled.add(studentId); changed += 1;
      }
    }
    if (submit) {
      const missing = [...rosterIds].filter((id) => !filled.has(id)).length;
      if (missing) fail(`${missing} student(s) have no marks yet. Enter marks or mark them absent before submitting.`);
    }
    tx.set(subRef, {
      tenantId, examId, sectionId, subjectId, campusId: exam.campusId, status: submit ? "SUBMITTED" : "DRAFT",
      ...(submit ? { submittedBy: uid, submittedAt: ts(), returnReason: null } : {}), updatedAt: ts(),
    }, { merge: true });
    auditInTx(tx, tenantId, { action: submit ? "MARKS_SUBMITTED" : "MARKS_SAVED", actorUid: uid, targetType: "examSubmission", targetId: `${examId}_${sectionId}_${subjectId}`, meta: { changed } });
  });
}
