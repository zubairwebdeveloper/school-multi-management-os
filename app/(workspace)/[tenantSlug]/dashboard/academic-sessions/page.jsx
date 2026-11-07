import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { PERMISSIONS as P } from "@/lib/permissions";
import SessionManager from "@/components/academics/SessionManager";

export const metadata = { title: "Academic sessions" };

export default async function Page({ params }) {
  const { tenantSlug } = await params;
  const ctx = await getTenantContext(tenantSlug);
  if (!ctx.permissions.includes(P.CAMPUS_VIEW)) notFound();

  const base = adminDb.doc(`tenants/${ctx.tenantId}`);
  const [sSnap, tSnap] = await Promise.all([
    base.collection("academicSessions").orderBy("startDate", "desc").get(),
    base.collection("academicTerms").get(),
  ]);
  const terms = tSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const sessions = sSnap.docs.map((d) => {
    const s = d.data();
    return {
      id: d.id, name: s.name, startDate: s.startDate, endDate: s.endDate, status: s.status,
      terms: terms.filter((t) => t.sessionId === d.id)
        .sort((a, b) => a.startDate.localeCompare(b.startDate))
        .map((t) => ({ id: t.id, name: t.name, startDate: t.startDate, endDate: t.endDate })),
    };
  });

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Academic sessions</h1>
      <SessionManager slug={tenantSlug} sessions={sessions} canManage={ctx.permissions.includes(P.ACADEMICS_MANAGE) && ctx.orgWide} />
    </div>
  );
}
