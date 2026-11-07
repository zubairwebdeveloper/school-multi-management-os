# Student attendance (Batch 9 / Phase 8, part 1)

Routes: /{slug}/dashboard/attendance (mark), /corrections (approvers), /reports (monthly)
Mutations: attendance/actions.js (saveSectionAttendance, requestCorrection, reviewCorrection)

Data (tenants/{id}/...)
- studentAttendance/{studentId}_{date}: one document per student per day (deterministic id => no duplicates, idempotent saves).
  status PRESENT|ABSENT|LATE|LEAVE|HALF_DAY, remark, version, previousStatus, source MANUAL|CORRECTION, editedAfterDay
- attendanceDays/{sectionId}_{date}: "attendance was taken" marker + counts (basis for missing-attendance detection later)
- attendanceCorrections/{id}: fromStatus -> toStatus, reason, PENDING|APPROVED|REJECTED, requestedBy, reviewedBy

Rules enforced on the server
- Dates are YYYY-MM-DD in the school timezone (tenant settings.timezone, default Asia/Karachi). Future dates are rejected.
- Today: ATTENDANCE_MARK. Past dates (max 30 days back): only ATTENDANCE_APPROVE may edit directly; everyone else files a
  correction request. Older than 30 days is locked. Dates must fall inside the academic session; closed sessions are frozen.
- Campus access, active section, and "student is an ACTIVE member of this section" are verified in the transaction.
- A reviewer cannot approve their own request (separation of duties). Approval applies the change and updates the day counts
  in the same transaction. Every change writes an audit entry; attendance rows keep version + previousStatus.
- The sheet requires every student to be marked before saving (no accidental "present by default").

Security hardening in this batch
- lib/tenant/authorizeAction.js (replaces the Batch 7 file): dashboard Server Actions now reject ASSIGNED / LINKED / OWN scopes.
  Teachers, parents and students get portal actions with assignment/relationship checks (Phases 9 and 13), so they cannot
  call staff actions directly. `permission` may be an array (any of).

Percentage: (present + late + half-day x 0.5) / (present + absent + late + half-day); leave days excluded. Only recorded days count;
no school calendar exists yet, so "days not marked" is NOT reported (it would mix in weekends/holidays).

Indexes: firestore.indexes.json is replaced again (adds studentAttendance and attendanceDays by sectionId+date). Deploy it.

Not yet: teacher marking limited to assigned sections (Phase 9 teacher assignments + portal), QR/ID scan, offline queue (Phase 20),
parent absence notifications (Phase 14), staff attendance, leave integration, holidays calendar, CSV export, tests.
