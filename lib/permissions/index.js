import { ROLE_DEFINITIONS } from "./roles";
import { SCOPES } from "./permissions";

export { PERMISSIONS, SCOPES } from "./permissions";
export { ROLE_DEFINITIONS, PLATFORM_ROLES } from "./roles";

/**
 * membership: { role, status, campusIds?: string[], extraPermissions?: string[] }
 * Membership comes from the server-read tenants/{tenantId}/members/{uid}.
 * Never pass client-supplied membership here.
 */
export function hasPermission(membership, permission) {
  if (!membership || membership.status !== "ACTIVE") return false;
  const def = ROLE_DEFINITIONS[membership.role];
  if (!def) return false;
  return (
    def.permissions.includes(permission) ||
    (membership.extraPermissions || []).includes(permission)
  );
}

export function canAccessCampus(membership, campusId) {
  if (!membership || membership.status !== "ACTIVE") return false;
  const def = ROLE_DEFINITIONS[membership.role];
  if (!def) return false;
  if (def.scope === SCOPES.ORGANIZATION) return true;
  return (membership.campusIds || []).includes(campusId);
}

export function can(membership, permission, campusId) {
  if (!hasPermission(membership, permission)) return false;
  return campusId ? canAccessCampus(membership, campusId) : true;
}
