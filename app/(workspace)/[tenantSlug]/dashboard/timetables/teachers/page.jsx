import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { PERMISSIONS as P } from "@/lib/permissions";
import { getTenantTimezone } from "@/lib/tenant/getTimezone";
import { todayInZone } from "@/lib/utils/dates";
import TimetableTabs from "@/components/timetable/TimetableTabs";
import QuerySelect from "@/components/timetable/QuerySelect";
import PrintButton from "@/components/timetable/PrintButton";
import ReadOnlyGrid from "@/components/timetable/ReadOnlyGrid";

export const metadata = { title: "Teacher timetable" };
export const dynamic = "force-dynamic";

export default async function TeacherTimetablePage({ params, searchParams }) {
  const { tenantSlug } = await params;
  const sp = await searchParams;
  const ctx = await getTenantContext(tenantSlug);
  if (!ctx.permissions.includes(P.CAMPUS_VIEW)) notFound();

  const base = adminDb.doc(`tenants/${ctx.tenantId}`);
  const sessQ = await base.collection("academicSessions").where("status", "==", "ACTIVE").limit(1).get();
  let body = <p className="text-sm text-slate-500">No active academic session.</p>;

  if (!sessQ.empty) {
    const session = { id: sessQ.docs[0].id, ...sessQ.docs[0].data() };
    const visible = new Set((ctx.selectedCampusId === "ALL" ? ctx.campuses : ctx.campuses.filter((c) => c.id === ctx.selectedCampusId)).map((c) => c.id));
    const empSnap = await base.collection("employees").where("status", "==", "ACTIVE").where("staffType", "==", "TEACHING").get();
    const teachers = empSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((t) => visible.has(t.campusId)).sort((a, b) => a.nameLower.localeCompare(b.nameLower));

    if (!teachers.length) body = <p className="text-sm text-slate-500">No active teaching staff for the selected campus.</p>;
    else {
      const teacher = teachers.find((t) => t.id === sp.teacher) || teachers[0];
      const today = todayInZone(await getTenantTimezone(ctx.tenantId));
      const [ttSnap, entSnap, subSnap, secSnap, clsSnap, subjSnap, substSnap] = await Promise.all([
        base.collection("timetables").doc(`${teacher.campusId}_${session.id}`).get(),
        base.collection("timetableEntries").where("employeeId", "==", teacher.id).where("sessionId", "==", session.id).get(),
        base.collection("subjects").get(), base.collection("sections").where("sessionId", "==", session.id).get(), base.collection("classes").get(), base.collection("subjects").get(),
        base.collection("timetableSubstitutions").where("substituteEmployeeId", "==", teacher.id).get(),
      ]);
      const subj = Object.fromEntries(subjSnap.docs.map((d) => [d.id, d.data().name]));
      const cls = Object.fromEntries(clsSnap.docs.map((d) => [d.id, d.data().name]));
      const sec = Object.fromEntries(secSnap.docs.map((d) => [d.id, `${cls[d.data().classId] || ""} – ${d.data().name}`]));
      const cells = {};
      entSnap.docs.forEach((d) => { const e = d.data(); cells[`${e.day}_${e.periodId}`] = { lines: [sec[e.sectionId] || "—", subj[e.subjectId] || "—", ...(e.room ? [`Room ${e.room}`] : [])] }; });
      const upcoming = substSnap.docs.map((d) => d.data()).filter((s) => s.date >= today).sort((a, b) => a.date.localeCompare(b.date));

      body = !ttSnap.exists ? <p className="text-sm text-slate-500">This campus has no timetable periods yet.</p> : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <QuerySelect basePath={`/${tenantSlug}/dashboard/timetables/teachers`} name="teacher" label="Teacher" value={teacher.id}
              options={teachers.map((t) => ({ value: t.id, label: `${t.firstName} ${t.lastName}${ctx.selectedCampusId === "ALL" && ctx.campuses.length > 1 ? ` (${ctx.campuses.find((c) => c.id === t.campusId)?.name})` : ""}` }))} />
            <PrintButton />
          </div>
          <h2 className="hidden text-lg font-semibold print:block">{teacher.firstName} {teacher.lastName} · {session.name}</h2>
          <ReadOnlyGrid days={ttSnap.data().days} periods={ttSnap.data().periods} cell={(d, p) => cells[`${d}_${p}`]} caption="Weekly teacher timetable" />
          <p className="text-xs text-slate-500">Weekly lessons: {entSnap.size}. Lessons follow the class assignments; use "Update teachers from assignments" on the class timetable after reassigning.</p>
          {upcoming.length > 0 && (
            <section className="rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">
              <h3 className="mb-1 font-semibold">Upcoming substitution duties</h3>
              <ul className="space-y-1">{upcoming.map((s) => <li key={`${s.entryId}_${s.date}`}>{s.date} · {sec[s.sectionId] || "—"} · {ttSnap.data().periods.find((p) => p.id === s.periodId)?.name || ""}</li>)}</ul>
            </section>
          )}
        </div>
      );
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight print:hidden">Timetables</h1>
      <TimetableTabs slug={tenantSlug} active="teachers" />
      {body}
    </div>
  );
}
