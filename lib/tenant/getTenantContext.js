import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { ROLE_DEFINITIONS, SCOPES, canAccessCampus } from "@/lib/permissions";

const SLUG_RE = /^[a-z0-9-]{1,60}$/;

/**
 * Resolves slug -> tenant, verifies the signed-in user's ACTIVE membership
 * (read server-side) and returns the campuses that user may access.
 * Unknown tenant and "not a member" both return 404 so tenants cannot be enumerated.
 */
export const getTenantContext = cache(async (slug) => {
  if (!SLUG_RE.test(slug)) notFound();

  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/${slug}/dashboard`);

  const slugSnap = await adminDb.doc(`tenantSlugs/${slug}`).get();
  if (!slugSnap.exists) notFound();
  const tenantId = slugSnap.data().tenantId;

  const tenantRef = adminDb.doc(`tenants/${tenantId}`);
  const [tenantSnap, memberSnap, campusSnap] = await Promise.all([
    tenantRef.get(),
    tenantRef.collection("members").doc(user.uid).get(),
    tenantRef.collection("campuses").where("status", "==", "ACTIVE").get(),
  ]);
  if (!tenantSnap.exists || !memberSnap.exists) notFound();

  const membership = memberSnap.data();
  if (membership.status !== "ACTIVE" || !ROLE_DEFINITIONS[membership.role]) notFound();

  const scope = ROLE_DEFINITIONS[membership.role].scope;
  const permissions = [
    ...new Set([...ROLE_DEFINITIONS[membership.role].permissions, ...(membership.extraPermissions || [])]),
  ];

  const campuses = campusSnap.docs
    .filter((d) => canAccessCampus(membership, d.id))
    .map((d) => ({ id: d.id, name: d.data().name, city: d.data().city || "", isPrimary: !!d.data().isPrimary }))
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.name.localeCompare(b.name));

  // Selected campus comes from a cookie but is ALWAYS validated against allowed campuses.
  const cookieValue = (await cookies()).get(`campus-${slug}`)?.value;
  const orgWide = scope === SCOPES.ORGANIZATION;
  let selectedCampusId = "ALL";
  if (cookieValue && campuses.some((c) => c.id === cookieValue)) selectedCampusId = cookieValue;
  else if (!orgWide) selectedCampusId = campuses[0]?.id || "NONE";

  const t = tenantSnap.data();
  return {
    user,
    tenantId,
    slug,
    tenant: { name: t.profile?.name || slug, status: t.status, subscriptionStatus: t.subscription?.status || "UNKNOWN" },
    membership: { role: membership.role, scope },
    permissions,
    campuses,
    selectedCampusId,
    orgWide,
  };
});
