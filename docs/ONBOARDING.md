# Onboarding (Batch 3 / Phase 3, part 1)

Flow: verified user -> /onboarding form -> POST /api/onboarding/applications
-> tenantApplications/{autoId} with status PENDING -> /onboarding/pending

Server guarantees
- applicantUid, applicantEmail, status, timestamps are set only on the server.
- Zod validation on the server (client validation is only UX).
- Transaction blocks a second application while one is PENDING / UNDER_REVIEW / APPROVED.
- Audit entry written to platformAuditLogs.
- No tenant, role or membership is created here. Approval (next batch) does that.

Firestore indexes required (create via console link in the first error, or firestore.indexes.json):
- tenantApplications: applicantUid ASC, createdAt DESC
- tenantApplications: applicantUid ASC, status ASC   (the `in` query)

Rules: tenantApplications is already server-write-only in firestore.rules (Batch 1).

Not yet: approval/rejection by Super Admin, tenant + owner membership + campus creation,
notification emails, document upload, slug selection.
