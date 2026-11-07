# Teacher portal (Batch 13 / Phase 13, part 1)

Routes: /{slug}/teacher/dashboard, /classes, /timetable, /attendance   (the dashboard layout already redirects ASSIGNED roles here)

Access model
- getTeacherContext (server): valid session -> tenant ACTIVE -> membership ACTIVE with an ASSIGNED-scope role (TEACHER or
  CLASS_TEACHER) -> linked employee is ACTIVE and employees.linkedUid == this user. Anything else is 404 (or a redirect to the
  right area for other roles). No tenant/role/campus/teacher id is ever read from the URL or client.
- What a teacher can see is DERIVED from assignments (lib/tenant/teacherWork.js): sections where they are class teacher
  (sections.classTeacherId) or teach a subject (teachingAssignments), in the ACTIVE session and inside their membership campuses.
  Student rosters show only name + admission number (no addresses, phone numbers or guardian details).
- Attendance: only today, only for sections where the teacher is CLASS TEACHER (verified inside the transaction against
  sections.classTeacherId). Past dates stay with the administrator correction workflow. Writes are audited with via:"teacher-portal".
- Timetable: the teacher's own lessons and upcoming substitution duties, only after the campus timetable is PUBLISHED.
- Dashboard "Today": today's lessons (school timezone), "Covered by <substitute>" notes, substitution duties, and whether
  attendance was taken for each class-teacher section.

Change to an earlier batch
- components/attendance/AttendanceSheet.jsx is REPLACED by a complete version that accepts an optional `saveAction` prop
  (default = the dashboard action), so the portal can plug in its own Server Action with its own authorization.

Security notes
- Dashboard Server Actions already reject ASSIGNED scope (Batch 9), so a teacher cannot call staff actions directly.
- saveTeacherAttendance duplicates the dashboard transaction on purpose (different authorization). If the logic changes in one,
  change the other, or extract a shared function once both are covered by tests.

Not yet: marking attendance for non-class-teacher sections (per-period attendance), homework/assignments, marks entry,
lesson plans, parent messaging, leave requests, profile page, parent and student portals (those redirects still 404), tests
(teacher A cannot read/mark teacher B's section, inactive/unlinked teacher, past-date attempt, forged sectionId).
Indexes: equality-only queries; no new composite index.
