# Students and guardians (Batch 8 / Phase 7, part 1)

Routes: /{slug}/dashboard/students, /new, /{studentId}      Mutations: students/actions.js (Server Actions)

Data (tenants/{id}/...)
- students: campusId, admissionNumber (ADM-00001, from counters/admissionNumber inside the same transaction),
  names, nameLower (search), gender, dateOfBirth, address, status ACTIVE|WITHDRAWN|GRADUATED,
  classId/sectionId/sessionId/enrollmentId (current placement)
- guardians: fullName, phone, phoneNormalized, email   (one guardian record can serve several siblings)
- studentGuardians: studentId, guardianId, relationship, isPrimary
- enrollments: one per placement; ended (never deleted) on section change / withdrawal / graduation

Authorization (server-derived, nothing trusted from the client)
- List/profile: STUDENTS_READ; student's campus must be accessible (campus-scoped users cannot open other campuses' students by URL).
- Admit: STUDENTS_CREATE. Edit/move/withdraw/guardians: STUDENTS_UPDATE.
- Class, section and active session are validated in the transaction; campusId is taken from the validated class.

Integrity
- Admission number allocation, student, guardian, link, enrollment and audit entry are ONE transaction (no partial admissions,
  no duplicate numbers).
- Section capacity enforced on admit and on section change.
- Same-phone guardian is reused (siblings). Last/primary guardian cannot be unlinked.
- Withdraw/graduate keeps the record and history. Audit entries hold field names and ids, not personal values.

Search: prefix match on name or admission number (Firestore has no substring search). Requires the composite indexes in
firestore.indexes.json (this file REPLACES the earlier one; it includes the tenantApplications indexes).
Deploy: firebase deploy --only firestore:indexes

Not yet: photo, documents, CSV import/export, ID card + QR, cross-campus transfer, reinstatement, class/section filters,
guardian portal accounts, admissions pipeline (next), consent records, tests.
