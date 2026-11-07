import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { PERMISSIONS as P } from "@/lib/permissions";
import StudentCreateForm from "@/components/students/StudentCreateForm";

export const metadata = { title: "Admit student" };
export const dynamic = "force-dynamic";

export default async function NewStudentPage({ params }) {
  const { tenantSlug } = await params;
  const ctx = await getTenantContext(tenantSlug);
  if (!ctx.permissions.includes(P.STUDENTS_CREATE)) notFound();

  const base = adminDb.doc(`tenants/${ctx.tenantId}`);
  const sessSnap = await base.collection("academicSessions").where("status", "==", "ACTIVE").limit(1).get();

  if (sessSnap.empty) {
    return (
      <div className="max-w-xl rounded-xl border border-dashed border-slate-300 p-8 text-sm dark:border-slate-700">
        <h1 className="text-lg font-semibold">No active academic session</h1>
        <p className="mt-2 text-slate-500">Students are enrolled into sections of the active session. Activate a session first.</p>
        <Link href={`/${tenantSlug}/dashboard/academic-sessions`} className="mt-4 inline-block text-blue-600 hover:underline">Go to academic sessions</Link>
      </div>
    );
  }

  const ids = new Set(ctx.campuses.map((c) => c.id));
  const [cSnap, secSnap] = await Promise.all([
    base.collection("classes").where("status", "==", "ACTIVE").get(),
    base.collection("sections").where("sessionId", "==", sessSnap.docs[0].id).get(),
  ]);
  const classes = cSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((c) => ids.has(c.campusId))
    .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
    .map((c) => ({ id: c.id, campusId: c.campusId, name: c.name }));
  const sections = secSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((s) => s.status === "ACTIVE" && ids.has(s.campusId))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((s) => ({ id: s.id, classId: s.classId, name: s.name, capacity: s.capacity }));

  if (!classes.length || !sections.length) {
    return (
      <div className="max-w-xl rounded-xl border border-dashed border-slate-300 p-8 text-sm dark:border-slate-700">
        <h1 className="text-lg font-semibold">No classes or sections yet</h1>
        <p className="mt-2 text-slate-500">Create a class and a section for the active session before admitting students.</p>
        <Link href={`/${tenantSlug}/dashboard/classes`} className="mt-4 inline-block text-blue-600 hover:underline">Go to classes</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Admit student</h1>
      <StudentCreateForm
        slug={tenantSlug}
        campuses={ctx.campuses.map((c) => ({ id: c.id, name: c.name }))}
        classes={classes}
        sections={sections}
        defaultCampusId={ctx.selectedCampusId !== "ALL" && ctx.selectedCampusId !== "NONE" ? ctx.selectedCampusId : ""}
      />
    </div>
  );
}
