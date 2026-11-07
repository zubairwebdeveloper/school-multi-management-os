# Campus management (Batch 6 / Phase 5, part 2)

Routes: /{slug}/dashboard/campuses, /new, /{campusId}
Mutations: Server Actions in campuses/actions.js (createCampus, updateCampus, setCampusStatus)

Authorization (all derived on the server from the membership document)
- View list: CAMPUS_VIEW. Org-wide roles see all campuses; campus-scoped roles only their own.
- Create / activate / deactivate: CAMPUS_MANAGE AND organization-wide scope (campus admins cannot).
- Edit: CAMPUS_MANAGE, and the campus must be in the user's allowed campuses.
- tenantId / role / permissions are never read from the client.

Integrity
- Create/update/status run in transactions with the audit entry (tenants/{id}/auditLogs).
- Duplicate campus name or code (per tenant) is rejected.
- Primary campus cannot be deactivated.
- A campus with ACTIVE students cannot be deactivated.
- Plan limit: if tenants/{id}.subscription.limits.campuses is an integer, creation is blocked at that limit.
  (No plan exists yet, so no limit applies today. Plans arrive in Phase 19.)
- Audit entries record field names changed, not values.

Not yet: campus administrator assignment, campus branding/location map, organization profile + branding settings page,
audit log viewer, tests (emulator tests for campus-admin cross-campus edit and duplicate names).
