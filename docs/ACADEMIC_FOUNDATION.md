# Academic foundation (Batch 7 / Phase 6)

Routes: /{slug}/dashboard/academic-sessions, /classes, /subjects

Data (tenants/{tenantId}/...)
- academicSessions/{id}: name, startDate, endDate (YYYY-MM-DD), status DRAFT -> ACTIVE -> CLOSED
- academicTerms/{id}: sessionId, name, startDate, endDate
- classes/{id}: campusId, name, level (sort order), curriculum, status ACTIVE|ARCHIVED   (session-independent)
- sections/{id}: campusId (copied from class on the server), classId, sessionId, name, capacity, status
- subjects/{id}: name, code, category, curriculum (or ALL), status

Rules enforced on the server (Server Actions, transactions + audit entries)
- New permission ACADEMICS_MANAGE (Batch 1 files permissions.js / roles.js are replaced by complete versions here).
- Sessions, terms, subjects: ACADEMICS_MANAGE + organization-wide scope.
- Classes, sections: ACADEMICS_MANAGE + the campus must be an ACTIVE campus the user can access.
- Session dates cannot overlap; only one ACTIVE session; a CLOSED session is frozen (no new terms/sections/edits).
- Terms must sit inside their session and cannot overlap each other.
- Section belongs to exactly one session, so records from different sessions are never mixed.
- Unique names: class per campus, section per class+session, subject per curriculum, codes unique.
- Archive guards: a class with ACTIVE sections, or a section with ACTIVE students, cannot be archived;
  capacity cannot drop below enrolled students (these use students.sectionId/status, which Phase 7 will populate).
- No hard deletes except terms in non-closed sessions.

Not yet: class-subject assignment, teacher allocation, curriculum outcomes, promotion rules, grading policies,
holidays/calendar, session closure checks (open exams/fees), tests.
Index note: only single-field queries are used; no new composite index is required.
