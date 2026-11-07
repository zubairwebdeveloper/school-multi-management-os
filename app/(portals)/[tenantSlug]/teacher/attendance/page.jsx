import Link from "next/link";
import { adminDb } from "@/lib/firebase/admin";
import { getTeacherContext } from "@/lib/tenant/getTeacherContext";
import { loadTeacherWork } from "@/lib/tenant/teacherWork";
import { getTenantTimezone } from "@/lib/tenant/getTimezone";
import { todayInZone } from "@/lib/utils/dates";
import AttendanceSheet from "@/components/attendance/AttendanceSheet";
import QuerySelect from "@/components/timetable/QuerySelect";
import { saveTeacherAttendance } from "../actions";

export const metadata = { title: "Attendance" };
export const dynamic = "force-dynamic";

export default async function TeacherAttendance({ params, searchParams }) {
  const { tenantSlug } = await params;
  const sp = await searchParams;
  const tc = await getTeacherContext(tenantSlug);
  const work = await loadTeacherWork(tc);
  const mine = work.sections.filter((s) => s.isClassTeacher); // only class-teacher sections can be marked
  const today = todayInZone(await getTenantTimezone(tc.tenantId));

  let body;
  if (!tc.session) body = <p className="text-sm text-slate-500">No active academic session.</p>;
  else if (mine.length === 0) {
    body = (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-sm dark:border-slate-700">
        <p className="font-medium">You are not a class teacher in {tc.session.name}.</p>
        <p className="mt-1 text-slate-500">Daily attendance is taken by the class teacher. Ask an administrator if this should change.</p>
        <Link href={`/${tenantSlug}/teacher/classes`} className="mt-3 inline-block text-blue-600 hover:underline">View my classes</Link>
      </div>
    );
  } else if (today < tc.session.startDate || today > tc.session.endDate) {
    body = <p className="text-sm text-slate-500">Today is outside the academic session ({tc.session.startDate} to {tc.session.endDate}).</p>;
  } else {
    const section = mine.find((s) => s.id === sp.section) || mine[0];
    const base = adminDb.doc(`tenants/${tc.tenantId}`);
    const [rosterSnap, markSnap] = await Promise.all([
      base.collection("students").where("sectionId", "==", section.id).where("status", "==", "ACTIVE").get(),
      base.collection("studentAttendance").where("sectionId", "==", section.id).where("date", "==", today).get(),
    ]);
    const marks = Object.fromEntries(markSnap.docs.map((d) => [d.data().studentId, d.data()]));
    const students = rosterSnap.docs
      .map((d) => ({ id: d.id, name: `${d.data().firstName} ${d.data().lastName}`, admissionNumber: d.data().admissionNumber, status: marks[d.id]?.status || null, remark: marks[d.id]?.remark || "" }))
      .sort((a, b) => a.name.localeCompare(b.name));

    body = (
      <div className="space-y-4">
        {mine.length > 1 && <QuerySelect basePath={`/${tenantSlug}/teacher/attendance`} name="section" label="Class & section" value={section.id} options={mine.map((s) => ({ value: s.id, label: s.label }))} />}
        <p className="text-sm text-slate-500">{section.label} · {today}. You can mark and edit today's attendance. Past dates are corrected by an administrator.</p>
        <AttendanceSheet key={`${section.id}-${markSnap.size}`} slug={tenantSlug} sectionId={section.id} date={today} students={students} editable saveAction={saveTeacherAttendance} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
      {body}
    </div>
  );
}
