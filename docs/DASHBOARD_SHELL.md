# Dashboard shell (Batch 5 / Phase 5, part 1)

Route: /{tenantSlug}/dashboard

Server-side checks (lib/tenant/getTenantContext.js), every request:
1. Session cookie valid, else redirect to /login?next=...
2. tenantSlugs/{slug} -> tenantId (unknown slug => 404)
3. tenants/{tenantId}/members/{uid} exists and ACTIVE (otherwise 404, so tenants cannot be enumerated)
4. Campuses are filtered with canAccessCampus(); the selected-campus cookie is validated against that list
5. Layout redirects teacher/parent/student scopes to their portals (not built yet) and blocks non-ACTIVE tenants

Navigation: lib/navigation/sections.js is the single list. The sidebar hides links the user lacks permission for,
and the [section] page re-checks the permission on the server. Hiding is UX only.

Overview numbers are real counts (Firestore count()); users without permission see "—". Nothing is mocked.

When you build a module, create dashboard/<href>/page.jsx. It overrides the placeholder automatically,
and must call getTenantContext + check its own permission.

Needs: lucide-react. Dark mode uses the existing .dark class.
Not yet: org switcher for multi-tenant users, academic session switcher, notification center, command menu,
Redux slices, portal routes, tests.
