import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { loadAttendanceSections } from "@/lib/tenant/attendanceSections";
import { PERMISSIONS as P } from "@/lib/permissions";
import StaffTabs from "@/components/staff/StaffTabs";
import AssignmentsManager, { SectionSelect } from "@/components/staff/AssignmentsManager";

export const metadata = { title: "Class assignments" };
export const dynamic = "force-dynamic";

export default async function AssignmentsPage({ params, searchParams }) {
  const { tenantSlug } = await params;
  const sp = await searchParams;
  const ctx = await getTenantContext(tenantSlug);
  if (!ctx.permissions.includes(P.STAFF_READ)) notFound();
  const canManage = ctx.permissions.includes(P.STAFF_MANAGE) || ctx.permissions.includes(P.ACADEMICS_MANAGE);

  const { session, sections } = await loadAttendanceSections(ctx);
  let body;
  if (!session) body = <p className="text-sm text-slate-500">No active academic session. Activate one first.</p>;
  else if (!sections.length) body = <p className="text-sm text-slate-500">No sections available for the selected campus.</p>;
  else {
    const section = sections.find((s) => s.id === sp.section) || sections[0];
    const base = adminDb.doc(`tenants/${ctx.tenantId}`);
    const secSnap = await base.collection("sections").doc(section.id).get();
    const sec = secSnap.data();
    const [clsSnap, subSnap, empSnap, asSnap] = await Promise.all([
      base.collection("classes").doc(sec.classId).get(),
      base.collection("subjects").where("status", "==", "ACTIVE").get(),
      base.collection("employees").where("campusId", "==", sec.campusId).get(),
      base.collection("teachingAssignments").where("sectionId", "==", section.id).get(),
    ]);
    const curriculum = clsSnap.data()?.curriculum;
    const subjects = subSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((s) => s.curriculum === "ALL" || s.curriculum === curriculum)
      .sort((a, b) => a.name.localeCompare(b.name)).map((s) => ({ id: s.id, name: s.name, code: s.code || "" }));
    const teachers = empSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((t) => t.status === "ACTIVE" && t.staffType === "TEACHING")
      .sort((a, b) => a.nameLower.localeCompare(b.nameLower)).map((t) => ({ id: t.id, name: `${t.firstName} ${t.lastName}` }));
    const assignments = Object.fromEntries(asSnap.docs.map((d) => [d.data().subjectId, d.data().employeeId]));

    body = (
      <div className="space-y-5">
        <SectionSelect basePath={`/${tenantSlug}/dashboard/teachers/assignments`} sections={sections} sectionId={section.id} />
        <AssignmentsManager key={`${section.id}-${asSnap.size}-${sec.classTeacherId || ""}`} slug={tenantSlug} sectionId={section.id}
          subjects={subjects} teachers={teachers} assignments={assignments} classTeacherId={sec.classTeacherId || ""} canManage={canManage} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">Teachers &amp; staff</h1>
      <StaffTabs slug={tenantSlug} active="assignments" />
      {body}
    </div>
  );
}
