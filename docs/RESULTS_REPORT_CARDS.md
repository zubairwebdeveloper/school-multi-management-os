# Results, positions and report cards (Batch 17 / Phase 11, part 2)

Dashboard: /examinations/{examId} (publish, results table, corrections) and /examinations/{examId}/report/{studentId}
Parent portal: /parent/results and /parent/results/{examId}?child=

Publishing (publishExam, RESULTS_APPROVE + campus access)
- Only a LOCKED exam. In ONE transaction the server reads the active class roster, all marks and the sections, computes every
  result and writes examResults/{examId}_{studentId} plus the exam's PUBLISHED status. Parents never see a half-published exam.
- Missing marks (for example a student admitted after locking) stop publication with a clear message; reopen and return the subject.
- Limits: up to 300 students and 6000 mark records per exam (single transaction).

Computation (lib/exams/compute.js, pure and unit-testable)
- Integer tenths throughout. percent = obtained / total x 100, rounded to 2 decimals. Grade = first band whose min <= percent
  (bands come from the exam's FROZEN copy).
- Subject PASS = not absent and percent >= pass percentage. A student PASSES only if every subject is passed. Absent counts as 0 and fails the subject.
- Positions use competition ranking (1, 2, 2, 4) by total marks, within the class and within the section. Failing students are
  ranked too; change the policy in compute.js if your school ranks only passing students.
- Result documents snapshot student name, admission number and section name, so later renames do not change an issued result.

Corrections after publication (correctMark, RESULTS_APPROVE)
- One mark at a time with a mandatory reason. The old and new values, the person and the time are stored in examCorrections
  (never overwritten) and shown in the Correction history. Affected results and class/section positions are recomputed in the
  same transaction, and result.version increases. Every correction is also audited.

Visibility
- Staff need EXAMS_MANAGE or RESULTS_APPROVE and campus access; the report card page re-checks both.
- Parents: result documents exist only after publication and are looked up by the parent's own child (server-built list from Batch 15);
  an unknown child or exam id returns 404. Parents see percentage, grade, result, position and the full report card.

Changes to earlier batches (complete replacements in this zip)
- dashboard/examinations/[examId]/page.jsx and components/exams/ExamControls.jsx (Batch 16): publish button, results, corrections.
- components/parent/ParentShell.jsx (Batch 15): adds the Results tab.

Not yet: teacher remarks / principal comments and attendance summary on the card, bulk "print all report cards", merit lists across
classes, unpublish, optional/elective subjects per student, grace marks, board-specific rules (BISE/FBISE/Cambridge) - no
official integration exists or is claimed, a student portal, notifications when results publish (Phase 14), tests (publish with
missing marks, ranking ties, correction recomputation, double publish race, parent A cannot open parent B's child result).
Indexes: equality-only queries; no new composite index is required.
