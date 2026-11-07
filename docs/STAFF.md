# Teachers, staff, departments and teaching assignments (Batch 10 / Phase 9, part 1)

Routes: /{slug}/dashboard/teachers (+ /new, /{employeeId}, /departments, /assignments)
Mutations: teachers/actions.js (Server Actions)

Data (tenants/{id}/...)
- departments: name, code, status ACTIVE|ARCHIVED (organization-wide)
- employees: campusId, staffId (STF-00001 via counters/staffId), names, nameLower, staffType TEACHING|NON_TEACHING,
  designation, departmentId, qualification, joinDate, status ACTIVE|INACTIVE, linkedUid (null until invitations exist)
  The spec's separate `teachers` collection is represented by employees where staffType == TEACHING (one source of truth).
  No salary data is stored here; payroll will have its own restricted collection.
- teachingAssignments/{sectionId}_{subjectId}: employeeId, classId, sessionId, campusId (deterministic id => exactly one
  teacher per subject per section; reassigning overwrites and audits previousEmployeeId)
- sections.classTeacherId: class teacher (one section per teacher per session)

Authorization (server-derived)
- View: STAFF_READ (campus-scoped users only see/open staff of their campuses).
- Create/edit/deactivate staff: STAFF_MANAGE + campus access. Departments: STAFF_MANAGE + organization-wide scope.
- Assign teachers / class teacher: STAFF_MANAGE or ACADEMICS_MANAGE + section's campus access.
- New permissions STAFF_READ / STAFF_MANAGE: permissions.js, roles.js and navigation/sections.js are REPLACED by complete versions.

Integrity rules
- Only an ACTIVE, TEACHING employee of the same campus as the section can be assigned; the subject must be ACTIVE and match the
  class curriculum (or be "ALL"); the section must be ACTIVE in a non-closed session.
- Deactivating a staff member deletes their subject assignments and clears class-teacher roles in the same transaction, so no
  section keeps an inactive teacher. History stays in the audit log. Staff are never deleted.
- A teacher with assignments cannot be switched to non-teaching; a department with active staff cannot be archived.
- Staff ID allocation, record and audit entry are one transaction. Audit entries store field names/ids, not personal values.

Not yet: employee documents/contracts, work schedules, staff attendance + leave, login accounts/invitations (role + scope
assignment, linkedUid), cross-campus teaching, timetable builder with conflict detection (next batch), teacher portal, tests.
Indexes: only equality queries on single fields (plus two equalities on sections), so no new composite index is required.
