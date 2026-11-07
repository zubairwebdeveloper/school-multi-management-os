# Team, invitations and memberships (Batch 12)

Routes: /{slug}/dashboard/settings, /settings/team (admins) and /invitation (public link target)
Data: tenants/{id}/invitations/{id} (tokenHash, role, campusIds, employeeId, status, expiresAt) and members/{uid}

Flow
1. Admin (SETTINGS_MANAGE) creates an invitation -> a one-time link is shown. Email delivery is NOT connected (Phase 14),
   so the admin copies and sends it. Only the SHA-256 hash of the 256-bit token is stored; it cannot be shown again.
2. Invitee opens /invitation, signs in (or registers + verifies) with the invited email, and presses Accept.
3. acceptInvitation (server) re-validates everything in one transaction: token hash (constant-time), PENDING, 7-day expiry,
   email match with the verified session email, tenant ACTIVE, role still valid, campuses still ACTIVE, staff record still
   free. Then it creates members/{uid}, links employees.linkedUid and marks the invitation ACCEPTED (+ audit).
   An invalid/expired/used link reveals nothing about the organization.

Privilege-escalation rules (lib/permissions/grant.js, enforced in every action)
- You can only grant a role whose permissions are a SUBSET of your own; organization-wide roles only if you are org-wide.
- OWNER, PARENT and STUDENT can never be invited here. The OWNER membership cannot be edited here (no ownership
  transfer yet), and nobody can change their own access.
- You can only manage members whose current role you could grant and who sit inside your campuses.
- Campus-limited admins can only choose campuses they belong to and only see people in those campuses.
- Teacher roles (TEACHER / CLASS_TEACHER) require a linked ACTIVE teaching staff record in the chosen campus
  (this link is what Phase 13 portals will use for assigned-class access).
- One pending invitation per email and per staff record; existing members cannot be re-invited.
- Suspending a member takes effect on their next request (every request re-reads the membership).

Firestore rules: invitations and members are already client-denied (tenant default deny); everything goes through the server.
Page sets referrer=no-referrer and noindex because the link contains the token.

Not yet: email delivery of invitations, resend/regenerate (revoke + re-invite today), ownership transfer, extraPermissions UI,
MFA enforcement, a login redirect that survives registration (after registering, reopen the link), tests
(escalation attempts, wrong-email accept, expired/revoked/replayed token, double-accept race).
