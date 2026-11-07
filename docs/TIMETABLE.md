# Timetable (Batch 11 / Phase 9, part 2)

Routes: /{slug}/dashboard/timetables (class grid), /teachers, /substitutions, /setup
Mutations: timetables/actions.js (savePeriods, setPublished, setLesson, clearLesson, syncSectionTeachers,
createSubstitution, removeSubstitution)

Data (tenants/{id}/...)
- timetables/{campusId}_{sessionId}: days (Mon=1..Sun=7), periods [{id,name,start,end,isBreak}], status DRAFT|PUBLISHED, version
- timetableEntries/{sectionId}_{day}_{periodId}: subjectId, employeeId, room, roomKey, plus campus/session/class ids.
  The deterministic id means a section can have only ONE lesson per slot (section conflicts are impossible by construction).
- timetableSubstitutions/{entryId}_{date}: original/substitute employee, reason, date, periodId

Conflict detection (inside the saving transaction, so two admins cannot both win a race)
- Teacher double-booking: same employee + day + period + session. Message names the clashing class.
- Room double-booking: same campus + room + day + period + session (room names are case-insensitive).
- Substitute checks: not the lesson's own teacher, active TEACHING staff of the same campus, free in that period on that
  weekday (regular lessons) and not covering another lesson at that date+period.
- The lesson's teacher is derived from the class assignment (teachingAssignments), never from the client.
  No assignment => lesson cannot be created. This keeps "who teaches what" in one place.

Rules
- Edit: ACADEMICS_MANAGE + campus access + ACTIVE section in the ACTIVE session. View: CAMPUS_VIEW.
- Periods must be ordered and non-overlapping; times are HH:MM. A period/day that still holds lessons cannot be removed, and a
  period holding lessons cannot become a break.
- Publishing needs at least one lesson. Changes after publishing are allowed and audited with published:true.
- Substitutions are for today/future dates inside the session and on a day that has a lesson; removing a lesson also removes
  its substitutions. Past substitutions are kept as a record.
- Every change writes an audit entry (ids and field names only).

Known limitation (intentional, visible in the UI)
- Lessons store the teacher at the time they were saved. If a subject teacher is later reassigned, the grid shows
  "Teacher changed" and an "Update teachers from assignments" button re-derives teachers (re-checking clashes).
  Until then the teacher timetable still reflects the old teacher. Cascading automatically needs changes to the staff
  assignment actions and is planned with the teacher portal.

Not yet: drag-and-drop editor (click-to-edit is used), per-subject weekly hour targets, room master list, student/parent
views of the published timetable (portals), automatic generation, tests (clash races, break/day removal guards).
Indexes: equality-only queries (and one single-field date range), so no composite index is required.
