# Security foundation (Batch 1)

- lib/permissions: roles -> permissions + scopes (single source of truth)
- lib/firebase/admin.js: server-only Admin SDK
- lib/auth/requireTenantAccess.js: call at the top of every route handler / server action
- firestore.rules: tenant + campus isolation; sensitive collections are server-only

## Usage in a route handler
```js
import { requireTenantAccess, accessErrorResponse } from "@/lib/auth/requireTenantAccess";
import { PERMISSIONS } from "@/lib/permissions";

export async function GET(req, { params }) {
  try {
    const { tenantId } = await params;
    const campusId = new URL(req.url).searchParams.get("campusId");
    await requireTenantAccess({ tenantId, permission: PERMISSIONS.STUDENTS_READ, campusId });
    // ...query Firestore with tenantId + campusId filters
  } catch (e) { return accessErrorResponse(e); }
}
```

## Env (names only, put values in .env.local)
FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY, FIREBASE_STORAGE_BUCKET

## Limits
- Not tested yet. Rules need emulator tests (@firebase/rules-unit-testing) before use.
- ASSIGNED / LINKED / OWN scopes (teacher classes, parent-child) are not enforced yet; those need data-level checks in Phase 7/13.
- Requires `server-only` package and the `@/` alias in jsconfig.json.
