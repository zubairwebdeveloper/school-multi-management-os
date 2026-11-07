import "server-only";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { SCOPES } from "@/lib/permissions";

export const DENIED = { ok: false, error: "You do not have permission to do this." };

// Dashboard Server Actions are for organization/campus-wide staff only.
// Teachers (ASSIGNED), parents (LINKED) and students (OWN) get their own portal actions
// with assignment / relationship checks, so they can never reach these by calling them directly.
const DASHBOARD_SCOPES = [SCOPES.ORGANIZATION, SCOPES.CAMPUS];

/**
 * Resolves the caller from the server-side membership and checks permission.
 * `permission` may be one permission or an array (any of). Nothing about tenant,
 * role or permissions is taken from the client.
 */
export async function authorizeAction(slug, { permission, requireOrgWide = false }) {
  const ctx = await getTenantContext(slug);
  if (!DASHBOARD_SCOPES.includes(ctx.membership.scope)) return { error: DENIED };
  const needed = Array.isArray(permission) ? permission : [permission];
  if (!needed.some((p) => ctx.permissions.includes(p))) return { error: DENIED };
  if (requireOrgWide && !ctx.orgWide) return { error: DENIED };
  return { ctx };
}

/** True when the campus is an ACTIVE campus this user may access. */
export function hasCampus(ctx, campusId) {
  return ctx.campuses.some((c) => c.id === campusId);
}

export function failFrom(e, messages, fallback) {
  return { ok: false, error: messages[e.message] || fallback };
}
