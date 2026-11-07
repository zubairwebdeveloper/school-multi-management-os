import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { loadAttendanceSections } from "@/lib/tenant/attendanceSections";
import { PERMISSIONS as P } from "@/lib/permissions";
import TimetableTabs from "@/components/timetable/TimetableTabs";
import QuerySelect from "@/components/timetable/QuerySelect";
import PrintButton from "@/components/timetable/PrintButton";
import LessonGrid from "@/components/timetable/LessonGrid";

export const metadata = { title: "Timetables" };
export const dynamic = "force-dynamic";

export default async function ClassTimetablePage({ params, searchParams }) {
  const { tenantSlug } = await params;
  const sp = await searchParams;
  const ctx = await getTenantContext(tenantSlug);
  if (!ctx.permissions.includes(P.CAMPUS_VIEW)) notFound();
  const canManage = ctx.permissions.includes(P.ACADEMICS_MANAGE);

  const { session, sections } = await loadAttendanceSections(ctx);
  let body;
  if (!session) body = <p className="text-sm text-slate-500">No active academic session.</p>;
  else if (!sections.length) body = <p className="text-sm text-slate-500">No sections available for the selected campus.</p>;
  else {
    const section = sections.find((s) => s.id === sp.section) || sections[0];
    const base = adminDb.doc(`tenants/${ctx.tenantId}`);
    const [ttSnap, entSnap, asSnap, subSnap, empSnap] = await Promise.all([
      base.collection("timetables").doc(`${section.campusId}_${session.id}`).get(),
      base.collection("timetableEntries").where("sectionId", "==", section.id).get(),
      base.collection("teachingAssignments").where("sectionId", "==", section.id).get(),
      base.collection("subjects").get(),
      base.collection("employees").where("campusId", "==", section.campusId).get(),
    ]);

    if (!ttSnap.exists) {
      body = (
        <div className="rounded-xl border border-dashed border-slate-300 p-8 text-sm dark:border-slate-700">
          <p className="font-medium">No periods are set up for this campus yet.</p>
          {canManage && <Link href={`/${tenantSlug}/dashboard/timetables/setup?campus=${section.campusId}`} className="mt-2 inline-block text-blue-600 hover:underline">Set up periods</Link>}
        </div>
      );
    } else {
      const cfg = ttSnap.data();
      const subj = Object.fromEntries(subSnap.docs.map((d) => [d.id, d.data().name]));
      const emp = Object.fromEntries(empSnap.docs.map((d) => [d.id, `${d.data().firstName} ${d.data().lastName}`]));
      const current = Object.fromEntries(asSnap.docs.map((d) => [d.data().subjectId, d.data().employeeId]));

      let stale = 0;
      const cells = {};
      for (const d of entSnap.docs) {
        const e = d.data();
        const isStale = current[e.subjectId] !== e.employeeId;
        if (isStale) stale += 1;
        cells[`${e.day}_${e.periodId}`] = { subjectId: e.subjectId, subjectName: subj[e.subjectId] || "—", teacherName: emp[e.employeeId] || "—", room: e.room || "", stale: isStale };
      }
      const subjects = Object.entries(current).map(([id, eid]) => ({ id, name: subj[id] || "—", teacherName: emp[eid] || "—" })).sort((a, b) => a.name.localeCompare(b.name));

      body = (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <QuerySelect basePath={`/${tenantSlug}/dashboard/timetables`} name="section" label="Class & section" value={section.id}
              options={sections.map((s) => ({ value: s.id, label: s.label }))} />
            <div className="flex items-center gap-3 text-sm print:hidden">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${cfg.status === "PUBLISHED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{cfg.status === "PUBLISHED" ? "Published" : "Draft"}</span>
              <PrintButton />
            </div>
          </div>
          <h2 className="hidden text-lg font-semibold print:block">{section.label} · {session.name}</h2>
          <LessonGrid key={`${section.id}-${entSnap.size}-${stale}-${cfg.version}`} slug={tenantSlug} sectionId={section.id} days={cfg.days} periods={cfg.periods}
            cells={cells} subjects={subjects} editable={canManage} staleCount={stale} />
        </div>
      );
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight print:hidden">Timetables</h1>
      <TimetableTabs slug={tenantSlug} active="class" />
      {body}
    </div>
  );
}
