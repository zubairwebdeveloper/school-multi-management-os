import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { resolveCampus } from "@/lib/tenant/resolveCampus";
import { loadAttendanceSections } from "@/lib/tenant/attendanceSections";
import { getTenantTimezone } from "@/lib/tenant/getTimezone";
import { todayInZone } from "@/lib/utils/dates";
import { PERMISSIONS as P } from "@/lib/permissions";
import TimetableTabs from "@/components/timetable/TimetableTabs";
import QuerySelect from "@/components/timetable/QuerySelect";
import SubstitutionPanel from "@/components/timetable/SubstitutionPanel";

export const metadata = { title: "Substitutions" };
export const dynamic = "force-dynamic";

export default async function SubstitutionsPage({ params, searchParams }) {
  const { tenantSlug } = await params;
  const sp = await searchParams;
  const ctx = await getTenantContext(tenantSlug);
  if (!ctx.permissions.includes(P.CAMPUS_VIEW)) notFound();

  const campusId = resolveCampus(ctx, sp.campus);
  const base = adminDb.doc(`tenants/${ctx.tenantId}`);
  const { session, sections } = await loadAttendanceSections({ ...ctx, selectedCampusId: campusId || "NONE" });
  let body;
  if (!campusId || !session) body = <p className="text-sm text-slate-500">No active academic session or campus.</p>;
  else {
    const today = todayInZone(await getTenantTimezone(ctx.tenantId));
    const [ttSnap, empSnap, subSnap, clsSnap, secSnap] = await Promise.all([
      base.collection("timetables").doc(`${campusId}_${session.id}`).get(),
      base.collection("employees").where("campusId", "==", campusId).get(),
      base.collection("timetableSubstitutions").where("date", ">=", today).get(),
      base.collection("classes").get(), base.collection("sections").where("sessionId", "==", session.id).get(),
    ]);
    const periods = ttSnap.exists ? ttSnap.data().periods : [];
    const emp = Object.fromEntries(empSnap.docs.map((d) => [d.id, `${d.data().firstName} ${d.data().lastName}`]));
    const teachers = empSnap.docs.filter((d) => d.data().status === "ACTIVE" && d.data().staffType === "TEACHING")
      .map((d) => ({ id: d.id, name: emp[d.id], key: d.data().nameLower })).sort((a, b) => a.key.localeCompare(b.key));
    const cls = Object.fromEntries(clsSnap.docs.map((d) => [d.id, d.data().name]));
    const secLabel = Object.fromEntries(secSnap.docs.map((d) => [d.id, `${cls[d.data().classId] || ""} – ${d.data().name}`]));
    const upcoming = subSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((s) => s.campusId === campusId)
      .sort((a, b) => a.date.localeCompare(b.date) || a.periodId.localeCompare(b.periodId))
      .map((s) => ({ id: s.id, date: s.date, period: periods.find((p) => p.id === s.periodId)?.name || "", section: secLabel[s.sectionId] || "—", original: emp[s.originalEmployeeId] || "—", substitute: emp[s.substituteEmployeeId] || "—", reason: s.reason }));

    body = (
      <div className="space-y-5">
        {ctx.selectedCampusId === "ALL" && ctx.campuses.length > 1 && (
          <QuerySelect basePath={`/${tenantSlug}/dashboard/timetables/substitutions`} name="campus" label="Campus" value={campusId} options={ctx.campuses.map((c) => ({ value: c.id, label: c.name }))} />
        )}
        {!ttSnap.exists ? <p className="text-sm text-slate-500">Set up periods for this campus first.</p> : (
          <SubstitutionPanel slug={tenantSlug} sections={sections} periods={periods} teachers={teachers} upcoming={upcoming} canManage={ctx.permissions.includes(P.ACADEMICS_MANAGE)} />
        )}
      </div>
    );
  }
  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">Timetables</h1>
      <TimetableTabs slug={tenantSlug} active="substitutions" />
      {body}
    </div>
  );
}
