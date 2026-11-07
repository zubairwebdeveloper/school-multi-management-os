# Approval flow (Batch 4)

Platform admin (SUPER_ADMIN) -> /platform/applications -> Approve | Reject

Approve (single Firestore transaction, all-or-nothing)
1. Re-read the application; only PENDING / UNDER_REVIEW can be approved.
2. Reserve a unique slug in tenantSlugs/{slug} (base, base-xxxx, base-xxxxxxxx).
3. Create tenants/{autoId} (ACTIVE, timezone Asia/Karachi, currency PKR, subscription PENDING_PLAN).
4. Create the primary campus.
5. Create members/{applicantUid} with role OWNER, status ACTIVE.
6. Mark application APPROVED (tenantId, tenantSlug, reviewedBy) + audit log.
Retrying an approved application returns the same tenant (idempotent), so no duplicate tenants.

Reject: requires a reason; PENDING / UNDER_REVIEW only; audit logged.

Access
- /platform/* returns 404 unless platformAdmins/{uid} is ACTIVE.
- PLATFORM_SUPPORT is read-only; only SUPER_ADMIN can approve or reject.
- The first SUPER_ADMIN is created with scripts/bootstrap-admin.js (never from the UI).
  Run: node --env-file=.env.local scripts/bootstrap-admin.js you@example.com

Rules: tenantSlugs, platformAdmins, tenants writes are all client-denied (Batch 1 default deny).

Not yet: /{slug}/dashboard (Phase 5), applicant email notification, "under review" action,
subscription plan assignment, tests (emulator tests for double-approve and non-admin access).
