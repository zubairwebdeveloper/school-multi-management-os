import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { resolveCampus } from "@/lib/tenant/resolveCampus";
import { PERMISSIONS as P } from "@/lib/permissions";
import { DEFAULT_PERIODS } from "@/lib/validations/timetable";
import TimetableTabs from "@/components/timetable/TimetableTabs";
import QuerySelect from "@/components/timetable/QuerySelect";
import PeriodsEditor from "@/components/timetable/PeriodsEditor";

export const metadata = { title: "Timetable setup" };
export const dynamic = "force-dynamic";

export default async function SetupPage({ params, searchParams }) {
  const { tenantSlug } = await params;
  const sp = await searchParams;
  const ctx = await getTenantContext(tenantSlug);
  if (!ctx.permissions.includes(P.CAMPUS_VIEW)) notFound();

  const campusId = resolveCampus(ctx, sp.campus);
  const sessQ = await adminDb.collection(`tenants/${ctx.tenantId}/academicSessions`).where("status", "==", "ACTIVE").limit(1).get();
  let body;
  if (!campusId) body = <p className="text-sm text-slate-500">No campus available.</p>;
  else if (sessQ.empty) body = <p className="text-sm text-slate-500">No active academic session.</p>;
  else {
    const tt = await adminDb.doc(`tenants/${ctx.tenantId}/timetables/${campusId}_${sessQ.docs[0].id}`).get();
    const cfg = tt.exists ? tt.data() : null;
    body = (
      <div className="space-y-5">
        {ctx.selectedCampusId === "ALL" && ctx.campuses.length > 1 && (
          <QuerySelect basePath={`/${tenantSlug}/dashboard/timetables/setup`} name="campus" label="Campus" value={campusId} options={ctx.campuses.map((c) => ({ value: c.id, label: c.name }))} />
        )}
        <PeriodsEditor key={`${campusId}-${cfg?.version || 0}`} slug={tenantSlug} campusId={campusId} isNew={!cfg} status={cfg?.status || "DRAFT"}
          initialDays={cfg?.days || [1, 2, 3, 4, 5]} initialPeriods={cfg?.periods || DEFAULT_PERIODS} canManage={ctx.permissions.includes(P.ACADEMICS_MANAGE)} />
      </div>
    );
  }
  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">Timetables</h1>
      <TimetableTabs slug={tenantSlug} active="setup" />
      {body}
    </div>
  );
}
