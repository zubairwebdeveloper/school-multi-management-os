import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { ROLE_DEFINITIONS, SCOPES } from "@/lib/permissions";

const SLUG_RE = /^[a-z0-9-]{1,60}$/;

/**
 * Parent portal access. The ONLY children a parent can ever see are the students linked to their own guardian record
 * (studentGuardians.guardianId == their guardian). Child ids from the URL are matched against this server-built list.
 */
export const getParentContext = cache(async (slug) => {
  if (!SLUG_RE.test(slug)) notFound();
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=/${slug}/parent/dashboard`);

  const slugSnap = await adminDb.doc(`tenantSlugs/${slug}`).get();
  if (!slugSnap.exists) notFound();
  const tenantId = slugSnap.data().tenantId;
  const tenantRef = adminDb.doc(`tenants/${tenantId}`);
  const [tenant, member] = await Promise.all([tenantRef.get(), tenantRef.collection("members").doc(user.uid).get()]);
  if (!tenant.exists || !member.exists || tenant.data().status !== "ACTIVE") notFound();

  const m = member.data();
  const def = ROLE_DEFINITIONS[m.role];
  if (m.status !== "ACTIVE" || !def) notFound();
  if (def.scope !== SCOPES.LINKED) {
    redirect(def.scope === SCOPES.ASSIGNED ? `/${slug}/teacher/dashboard` : def.scope === SCOPES.OWN ? `/${slug}/student/dashboard` : `/${slug}/dashboard`);
  }
  if (!m.guardianId) notFound();

  const g = await tenantRef.collection("guardians").doc(m.guardianId).get();
  if (!g.exists || g.data().linkedUid !== user.uid) notFound();

  const links = await tenantRef.collection("studentGuardians").where("guardianId", "==", m.guardianId).get();
  const ids = [...new Set(links.docs.map((d) => d.data().studentId))];
  const docs = ids.length ? await adminDb.getAll(...ids.map((i) => tenantRef.collection("students").doc(i))) : [];
  const children = docs.filter((d) => d.exists)
    .map((d) => ({ id: d.id, name: `${d.data().firstName} ${d.data().lastName}`, adm: d.data().admissionNumber, campusId: d.data().campusId, classId: d.data().classId, sectionId: d.data().sectionId, status: d.data().status }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return { user, slug, tenantId, tenantName: tenant.data().profile?.name || slug, guardianName: g.data().fullName, children };
});

/** Picks the requested child only if it belongs to this parent; otherwise the first one. */
export function pickChild(pc, requested) {
  return pc.children.find((c) => c.id === requested) || pc.children[0] || null;
}
