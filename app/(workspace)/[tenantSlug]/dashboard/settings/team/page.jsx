import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { PERMISSIONS as P } from "@/lib/permissions";
import { grantableRoles, roleLabel, scopeKind } from "@/lib/permissions/grant";
import TeamManager from "@/components/team/TeamManager";

export const metadata = { title: "Team & access" };
export const dynamic = "force-dynamic";

export default async function TeamPage({ params }) {
  const { tenantSlug } = await params;
  const ctx = await getTenantContext(tenantSlug);
  if (!ctx.permissions.includes(P.SETTINGS_MANAGE)) notFound();

  const base = adminDb.doc(`tenants/${ctx.tenantId}`);
  const [mSnap, iSnap, eSnap] = await Promise.all([
    base.collection("members").get(),
    base.collection("invitations").where("status", "==", "PENDING").get(),
    base.collection("employees").where("status", "==", "ACTIVE").get(),
  ]);
  const mine = new Set(ctx.campuses.map((c) => c.id));
  const grantable = grantableRoles(ctx.permissions, ctx.orgWide);
  const roles = grantable.map((r) => ({ value: r, label: roleLabel(r), kind: scopeKind(r) }));
  const campusName = Object.fromEntries(ctx.campuses.map((c) => [c.id, c.name]));

  // Campus-limited admins only see people who work within their own campuses.
  const visible = (ids) => ctx.orgWide || (ids || []).some((id) => mine.has(id));
  const empById = Object.fromEntries(eSnap.docs.map((d) => [d.id, d.data()]));

  const members = mSnap.docs.map((d) => d.data()).filter((m) => ctx.orgWide || visible(m.campusIds))
    .map((m) => ({
      uid: m.uid, email: m.email, role: m.role, roleLabel: roleLabel(m.role), status: m.status, campusIds: m.campusIds || [],
      campusNames: (m.campusIds || []).map((id) => campusName[id]).filter(Boolean),
      staff: m.employeeId && empById[m.employeeId] ? `${empById[m.employeeId].firstName} ${empById[m.employeeId].lastName}` : "",
      isSelf: m.uid === ctx.user.uid,
      // UI hint only: the Server Action re-checks all of this.
      canManage: m.uid !== ctx.user.uid && m.role !== "OWNER" && grantable.includes(m.role) && (ctx.orgWide || (m.campusIds || []).every((id) => mine.has(id))),
    }))
    .sort((a, b) => a.email.localeCompare(b.email));

  const invitations = iSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((i) => visible(i.campusIds) || (ctx.orgWide))
    .map((i) => ({ id: i.id, email: i.email, roleLabel: roleLabel(i.role), expires: i.expiresAt.toDate().toISOString().slice(0, 10), canRevoke: grantable.includes(i.role) }));

  const employees = eSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((e) => !e.linkedUid && mine.has(e.campusId))
    .sort((a, b) => a.nameLower.localeCompare(b.nameLower))
    .map((e) => ({ id: e.id, name: `${e.firstName} ${e.lastName}`, staffId: e.staffId, campusId: e.campusId, staffType: e.staffType }));

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <Link href={`/${tenantSlug}/dashboard/settings`} className="text-sm text-blue-600 hover:underline">← Settings</Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Team &amp; access</h1>
      </div>
      <TeamManager slug={tenantSlug} roles={roles} campuses={ctx.campuses.map((c) => ({ id: c.id, name: c.name }))}
        employees={employees} members={members} invitations={invitations} />
    </div>
  );
}
