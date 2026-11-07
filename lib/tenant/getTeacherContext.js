import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { ROLE_DEFINITIONS, SCOPES } from "@/lib/permissions";

const SLUG_RE = /^[a-z0-9-]{1,60}$/;

/**
 * Teacher portal access. Identity comes from the session; tenant, role and the linked staff record come from
 * server-side documents. Everything else the teacher can see is derived from their ASSIGNMENTS, never from the URL.
 */
export const getTeacherContext = cache(async (slug) => {
  if (!SLUG_RE.test(slug)) notFound();
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/${slug}/teacher/dashboard`);

  const slugSnap = await adminDb.doc(`tenantSlugs/${slug}`).get();
  if (!slugSnap.exists) notFound();
  const tenantId = slugSnap.data().tenantId;
  const tenantRef = adminDb.doc(`tenants/${tenantId}`);
  const [tenant, member] = await Promise.all([tenantRef.get(), tenantRef.collection("members").doc(user.uid).get()]);
  if (!tenant.exists || !member.exists || tenant.data().status !== "ACTIVE") notFound();

  const m = member.data();
  const def = ROLE_DEFINITIONS[m.role];
  if (m.status !== "ACTIVE" || !def) notFound();
  if (def.scope !== SCOPES.ASSIGNED) {
    // Staff with organization/campus scope belong in the dashboard; other portals are separate.
    redirect(def.scope === SCOPES.LINKED ? `/${slug}/parent/dashboard` : def.scope === SCOPES.OWN ? `/${slug}/student/dashboard` : `/${slug}/dashboard`);
  }
  if (!m.employeeId) notFound();

  const emp = await tenantRef.collection("employees").doc(m.employeeId).get();
  if (!emp.exists || emp.data().status !== "ACTIVE" || emp.data().linkedUid !== user.uid) notFound();
  const e = emp.data();

  const sess = await tenantRef.collection("academicSessions").where("status", "==", "ACTIVE").limit(1).get();
  return {
    user, slug, tenantId, tenantName: tenant.data().profile?.name || slug, role: m.role, campusIds: m.campusIds || [],
    employee: { id: emp.id, firstName: e.firstName, lastName: e.lastName, staffId: e.staffId, campusId: e.campusId },
    session: sess.empty ? null : { id: sess.docs[0].id, name: sess.docs[0].data().name, startDate: sess.docs[0].data().startDate, endDate: sess.docs[0].data().endDate },
  };
});
