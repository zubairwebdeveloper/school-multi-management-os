import { adminDb } from "@/lib/firebase/admin";
import { getTeacherContext } from "@/lib/tenant/getTeacherContext";
import { loadTeacherWork } from "@/lib/tenant/teacherWork";
import { getTenantTimezone } from "@/lib/tenant/getTimezone";
import { todayInZone } from "@/lib/utils/dates";
import ReadOnlyGrid from "@/components/timetable/ReadOnlyGrid";
import PrintButton from "@/components/timetable/PrintButton";

export const metadata = { title: "Timetable" };
export const dynamic = "force-dynamic";

export default async function TeacherTimetable({ params }) {
  const { tenantSlug } = await params;
  const tc = await getTeacherContext(tenantSlug);
  const work = await loadTeacherWork(tc);
  const tt = work.timetable;

  let body;
  if (!tc.session) body = <p className="text-sm text-slate-500">No active academic session.</p>;
  else if (!tt || tt.status !== "PUBLISHED") body = <p className="text-sm text-slate-500">Your timetable has not been published yet.</p>;
  else {
    const base = adminDb.doc(`tenants/${tc.tenantId}`);
    const today = todayInZone(await getTenantTimezone(tc.tenantId));
    const [entSnap, dutySnap, clsSnap] = await Promise.all([
      base.collection("timetableEntries").where("employeeId", "==", tc.employee.id).where("sessionId", "==", tc.session.id).get(),
      base.collection("timetableSubstitutions").where("substituteEmployeeId", "==", tc.employee.id).get(),
      base.collection("classes").get(),
    ]);
    const cls = Object.fromEntries(clsSnap.docs.map((d) => [d.id, d.data().name]));
    const dutySecIds = [...new Set(dutySnap.docs.map((d) => d.data().sectionId))].filter((id) => !work.sections.find((s) => s.id === id));
    const extra = dutySecIds.length ? await adminDb.getAll(...dutySecIds.map((i) => base.collection("sections").doc(i))) : [];
    const secLabel = { ...Object.fromEntries(work.sections.map((s) => [s.id, s.label])), ...Object.fromEntries(extra.map((d) => [d.id, `${cls[d.data()?.classId] || ""} – ${d.data()?.name || ""}`])) };

    const cells = {};
    entSnap.docs.forEach((d) => { const e = d.data(); cells[`${e.day}_${e.periodId}`] = { lines: [secLabel[e.sectionId] || "—", work.subjects[e.subjectId] || "—", ...(e.room ? [`Room ${e.room}`] : [])] }; });
    const duties = dutySnap.docs.map((d) => d.data()).filter((s) => s.date >= today).sort((a, b) => a.date.localeCompare(b.date));

    body = (
      <div className="space-y-4">
        <div className="flex justify-end"><PrintButton /></div>
        <h2 className="hidden text-lg font-semibold print:block">{tc.employee.firstName} {tc.employee.lastName} · {tc.session.name}</h2>
        <ReadOnlyGrid days={tt.days} periods={tt.periods} cell={(d, p) => cells[`${d}_${p}`]} caption="My weekly timetable" />
        {duties.length > 0 && (
          <section className="rounded-xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-1 font-semibold">Upcoming substitution duties</h2>
            <ul className="space-y-1">{duties.map((s) => <li key={`${s.entryId}_${s.date}`}>{s.date} · {secLabel[s.sectionId] || "—"} · {tt.periods.find((p) => p.id === s.periodId)?.name || ""}</li>)}</ul>
          </section>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight print:hidden">Timetable</h1>
      {body}
    </div>
  );
}
