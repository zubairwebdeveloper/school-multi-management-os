import Link from "next/link";
import { adminDb } from "@/lib/firebase/admin";
import { getTeacherContext } from "@/lib/tenant/getTeacherContext";
import { loadTeacherWork } from "@/lib/tenant/teacherWork";
import { getTenantTimezone } from "@/lib/tenant/getTimezone";
import { todayInZone } from "@/lib/utils/dates";
import { DAYS, weekdayOf } from "@/lib/utils/weekday";

export const metadata = { title: "Today" };
export const dynamic = "force-dynamic";

const card = "rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900";

export default async function TeacherDashboard({ params }) {
  const { tenantSlug } = await params;
  const tc = await getTeacherContext(tenantSlug);
  const work = await loadTeacherWork(tc);
  const today = todayInZone(await getTenantTimezone(tc.tenantId));
  const day = weekdayOf(today);
  const base = adminDb.doc(`tenants/${tc.tenantId}`);
  const me = tc.employee.id;

  if (!tc.session) {
    return <div className={card}><h1 className="text-lg font-semibold">No active academic session</h1><p className="mt-1 text-sm text-slate-500">Your classes will appear once your school activates a session.</p></div>;
  }

  const [entSnap, dutySnap, coverSnap, dayDocs] = await Promise.all([
    base.collection("timetableEntries").where("employeeId", "==", me).where("sessionId", "==", tc.session.id).get(),
    base.collection("timetableSubstitutions").where("substituteEmployeeId", "==", me).get(),
    base.collection("timetableSubstitutions").where("originalEmployeeId", "==", me).get(),
    Promise.all(work.sections.filter((s) => s.isClassTeacher).map((s) => base.collection("attendanceDays").doc(`${s.id}_${today}`).get())),
  ]);

  const tt = work.timetable;
  const published = tt?.status === "PUBLISHED";
  const duties = dutySnap.docs.map((d) => d.data()).filter((s) => s.date === today);
  const covered = Object.fromEntries(coverSnap.docs.map((d) => d.data()).filter((s) => s.date === today).map((s) => [s.entryId, s.substituteEmployeeId]));

  // Names needed for display
  const needSec = [...new Set([...duties.map((d) => d.sectionId)])].filter((id) => !work.sections.find((s) => s.id === id));
  const subjIdsFromDuties = duties.length ? await Promise.all(duties.map((d) => base.collection("timetableEntries").doc(d.entryId).get())) : [];
  const secExtra = needSec.length ? await adminDb.getAll(...needSec.map((i) => base.collection("sections").doc(i))) : [];
  const clsDocs = await base.collection("classes").get();
  const cls = Object.fromEntries(clsDocs.docs.map((d) => [d.id, d.data().name]));
  const secLabel = { ...Object.fromEntries(work.sections.map((s) => [s.id, s.label])), ...Object.fromEntries(secExtra.map((d) => [d.id, `${cls[d.data()?.classId] || ""} – ${d.data()?.name || ""}`])) };
  const covIds = [...new Set(Object.values(covered))];
  const covDocs = covIds.length ? await adminDb.getAll(...covIds.map((i) => base.collection("employees").doc(i))) : [];
  const covName = Object.fromEntries(covDocs.map((d) => [d.id, `${d.data()?.firstName || ""} ${d.data()?.lastName || ""}`.trim()]));

  const lessons = [];
  for (const d of entSnap.docs) {
    const e = d.data();
    if (e.day !== day) continue;
    lessons.push({ periodId: e.periodId, subject: work.subjects[e.subjectId] || "—", section: secLabel[e.sectionId] || "—", room: e.room, note: covered[d.id] ? `Covered by ${covName[covered[d.id]] || "a substitute"}` : "" });
  }
  duties.forEach((d, i) => {
    const e = subjIdsFromDuties[i]?.data();
    lessons.push({ periodId: d.periodId, subject: work.subjects[e?.subjectId] || "Lesson", section: secLabel[d.sectionId] || "—", room: e?.room || "", note: "Substitute duty", duty: true });
  });
  const order = (id) => (tt?.periods || []).findIndex((p) => p.id === id);
  lessons.sort((a, b) => order(a.periodId) - order(b.periodId));
  const periodOf = (id) => tt?.periods?.find((p) => p.id === id);

  const ctSections = work.sections.filter((s) => s.isClassTeacher);
  const dayLabel = DAYS.find((d) => d.value === day)?.label;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hello, {tc.employee.firstName}</h1>
        <p className="mt-1 text-sm text-slate-500">{dayLabel}, {today} · {tc.session.name}</p>
      </div>

      <section className={card} aria-label="Today's lessons">
        <h2 className="text-base font-semibold">Today's lessons</h2>
        {!tt ? <p className="mt-2 text-sm text-slate-500">Your campus has no timetable yet.</p>
          : !published && lessons.length === 0 ? <p className="mt-2 text-sm text-slate-500">The timetable has not been published yet.</p>
          : lessons.length === 0 ? <p className="mt-2 text-sm text-slate-500">No lessons today.</p> : (
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {lessons.map((l, i) => (
              <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <span><span className="font-medium">{periodOf(l.periodId)?.name || "Period"}</span> <span className="text-slate-500">{periodOf(l.periodId) ? `${periodOf(l.periodId).start}–${periodOf(l.periodId).end}` : ""}</span><br />
                  {l.subject} · {l.section}{l.room ? ` · Room ${l.room}` : ""}</span>
                {l.note && <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${l.duty ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"}`}>{l.note}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {ctSections.length > 0 && (
        <section className={card} aria-label="Attendance today">
          <h2 className="text-base font-semibold">Attendance today</h2>
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {ctSections.map((s, i) => {
              const done = dayDocs[i]?.exists;
              return (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <span className="font-medium">{s.label}</span>
                  <span className="flex items-center gap-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${done ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{done ? "Taken" : "Not taken yet"}</span>
                    <Link href={`/${tenantSlug}/teacher/attendance?section=${s.id}`} className="text-blue-600 hover:underline">{done ? "Review" : "Mark now"}</Link>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
