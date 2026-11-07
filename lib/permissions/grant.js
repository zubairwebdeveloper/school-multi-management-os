
// Roles that can never be handed out through invitations.
// OWNER: ownership transfer is a separate, deliberate process. PARENT/STUDENT: portal accounts are created
// from guardian/student records, not staff invitations.
export const NON_INVITABLE = ["OWNER", "PARENT", "STUDENT"];

export const roleLabel = (r) => r.split("_").map((w) => w[0] + w.slice(1).toLowerCase()).join(" ");
export const scopeKind = (role) => {
  const s = ROLE_DEFINITIONS[role]?.scope;
  return s === SCOPES.ORGANIZATION ? "ORG" : s === SCOPES.ASSIGNED ? "ASSIGNED" : "CAMPUS";
};

/**
 * Privilege-escalation guard: you can only grant a role whose permissions are a subset of your own,
 * and only an organization-wide role if you are organization-wide yourself.
 */
export function grantableRoles(actorPermissions, actorOrgWide) {
  return Object.entries(ROLE_DEFINITIONS)
    .filter(([role, def]) => {
      if (NON_INVITABLE.includes(role)) return false;
      if (!def.permissions.every((p) => actorPermissions.includes(p))) return false;
      if (def.scope === SCOPES.ORGANIZATION && !actorOrgWide) return false;
      return true;
    })
    .map(([role]) => role);
}
