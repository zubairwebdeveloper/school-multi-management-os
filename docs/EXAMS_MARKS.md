# Examinations: setup, marks entry, verification (Batch 16 / Phase 11, part 1)

Routes (dashboard): /examinations, /new, /grading, /{examId}, /{examId}/marks?section=&subject=
Routes (teacher portal): /teacher/exams, /teacher/exams/{examId}?section=&subject=

Lifecycle: DRAFT -> OPEN (marks entry) -> LOCKED -> PUBLISHED. PUBLISHED, result calculation, positions and report cards arrive in
the NEXT batch. Until then an exam stops at LOCKED.

Data (tenants/{id}/...)
- gradingSystems: name + bands [{grade, min%}]. Immutable; create a new scale instead of editing. Each exam stores a FROZEN COPY of
  the bands and pass percentage, so later scale changes can never alter an exam.
- exams: campus/session/class, name, type, subjects [{subjectId, name, total}] (snapshots), bands, passPercent, status.
- examMarks/{examId}_{studentId}_{subjectId}: obtained10 (integer TENTHS, so 45.5 -> 455; sums are exact) or absent:true.
- examSubmissions/{examId}_{sectionId}_{subjectId}: DRAFT -> SUBMITTED -> VERIFIED (or returned to DRAFT with a reason).

Authorization (server-derived)
- Setup, open, lock, reopen, administrator marks entry, verify/return: EXAMS_MANAGE + campus access. Grading scales: org-wide scope.
  View: EXAMS_MANAGE or RESULTS_APPROVE (the Principal can view). Navigation now keys on RESULTS_APPROVE (replaced sections.js).
- Teachers: no role permission needed. They may enter marks ONLY where teachingAssignments/{sectionId}_{subjectId}.employeeId is
  themselves, in the exam's session and campus. The list of tasks is built from the same rule.
- One shared function (lib/exams/core.js runSaveMarks) performs every marks write for both surfaces and enforces: exam OPEN,
  subject belongs to the exam, section belongs to the exam's class AND session, students belong to the section and are ACTIVE,
  range 0..total with one decimal, no edits after SUBMITTED/VERIFIED. Blank entries delete the draft mark. Submit requires every
  student to have marks or be marked absent.

Integrity rules
- Verification must be done by a DIFFERENT person than the submitter (separation of duties). Reviewers can return SUBMITTED or
  VERIFIED marks for correction while the exam is OPEN.
- Locking requires: every non-empty section x subject VERIFIED and every active student to have a mark/absent for every subject
  (catches students admitted after marks were entered). Classes over 300 active students are refused (publishing computes in one
  transaction). Reopening is allowed before publication.
- Draft exams can be edited; once OPEN subjects, totals and the scale are frozen. Every step writes an audit entry.

Changes to earlier batches (complete replacements in this zip)
- lib/navigation/sections.js: Examinations visible with RESULTS_APPROVE.
- components/teacher/TeacherShell.jsx: adds the Exams tab.

Not yet (next batch): publish + result computation (totals, percentage, grade, pass/fail, class position), correction history after
publication, report cards (dashboard + parent), parent results view. Later: optional/elective subjects per student, grace marks,
remarks, exam timetable/rooms/seating, question bank, reassessment, tests (teacher A cannot enter teacher B's subject, submit with
missing students, double-submit, verifier = submitter, forged ids, locked exam edits).
Indexes: equality-only queries (several equalities on different fields), so no new composite index is required.
