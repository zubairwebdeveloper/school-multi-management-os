import { adminDb } from "@/lib/firebase/admin";
import { getTeacherContext } from "@/lib/tenant/getTeacherContext";
import { loadTeacherWork } from "@/lib/tenant/teacherWork";

export const metadata = { title: "My classes" };
export const dynamic = "force-dynamic";

export default async function TeacherClasses({ params }) {
  const { tenantSlug } = await params;
  const tc = await getTeacherContext(tenantSlug);
  const work = await loadTeacherWork(tc);
  const base = adminDb.doc(`tenants/${tc.tenantId}`);

  // Rosters ONLY for sections derived from this teacher's assignments. Minimal fields: name + admission number.
  const rosters = await Promise.all(work.sections.map((s) =>
    base.collection("students").where("sectionId", "==", s.id).where("status", "==", "ACTIVE").get()
  ));

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">My classes</h1>
      {!tc.session ? <p className="text-sm text-slate-500">No active academic session.</p>
        : work.sections.length === 0 ? <p className="text-sm text-slate-500">You have no class or subject assignments in {tc.session.name} yet.</p> : (
        <ul className="space-y-4">
          {work.sections.map((s, i) => {
            const students = rosters[i].docs.map((d) => ({ id: d.id, name: `${d.data().firstName} ${d.data().lastName}`, adm: d.data().admissionNumber })).sort((a, b) => a.name.localeCompare(b.name));
            return (
              <li key={s.id} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-semibold">{s.label}</h2>
                  <span className="text-sm text-slate-500">{students.length} student{students.length === 1 ? "" : "s"}</span>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {s.isClassTeacher && <span className="mr-2 rounded-full bg-[#D6B36A]/20 px-2 py-0.5 text-xs font-medium text-[#8a6d2b]">Class teacher</span>}
                  {s.subjects.length > 0 ? `Teaching: ${s.subjects.join(", ")}` : ""}
                </p>
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium text-blue-600">Student list</summary>
                  {students.length === 0 ? <p className="mt-2 text-sm text-slate-500">No active students.</p> : (
                    <ol className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                      {students.map((st) => <li key={st.id}>{st.name} <span className="font-mono text-xs text-slate-500">{st.adm}</span></li>)}
                    </ol>
                  )}
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
