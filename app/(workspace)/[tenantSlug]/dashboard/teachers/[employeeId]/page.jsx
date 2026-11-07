import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { PERMISSIONS as P } from "@/lib/permissions";
import { GENDERS } from "@/lib/validations/students";
import { STAFF_TYPES } from "@/lib/validations/staff";
import { card } from "@/components/academics/shared";
import EmployeeActions from "@/components/staff/EmployeeActions";

export const metadata = { title: "Staff member" };
export const dynamic = "force-dynamic";

export default async function EmployeePage({ params }) {
  const { tenantSlug, employeeId } = await params;
  const ctx = await getTenantContext(tenantSlug);
  if (!ctx.permissions.includes(P.STAFF_READ)) notFound();

  const base = adminDb.doc(`tenants/${ctx.tenantId}`);
  const snap = await base.collection("employees").doc(employeeId).get();
  if (!snap.exists) notFound();
  const e = snap.data();
  if (!ctx.orgWide && !ctx.campuses.some((c) => c.id === e.campusId)) notFound(); // campus-level authorization

  const canManage = ctx.permissions.includes(P.STAFF_MANAGE);
  const [aSnap, ctSnap, dSnap] = await Promise.all([
    base.collection("teachingAssignments").where("employeeId", "==", employeeId).get(),
    base.collection("sections").where("classTeacherId", "==", employeeId).get(),
    base.collection("departments").get(),
  ]);
  const departments = dSnap.docs.map((d) => ({ id: d.id, name: d.data().name, status: d.data().status }));
  const dept = departments.find((d) => d.id === e.departmentId)?.name;

  const assigns = aSnap.docs.map((d) => d.data());
  const secIds = [...new Set([...assigns.map((a) => a.sectionId), ...ctSnap.docs.map((d) => d.id)])];
  const subIds = [...new Set(assigns.map((a) => a.subjectId))];
  const [secDocs, subDocs] = await Promise.all([
    secIds.length ? adminDb.getAll(...secIds.map((i) => base.collection("sections").doc(i))) : [],
    subIds.length ? adminDb.getAll(...subIds.map((i) => base.collection("subjects").doc(i))) : [],
  ]);
  const clsIds = [...new Set(secDocs.map((d) => d.data()?.classId).filter(Boolean))];
  const clsDocs = clsIds.length ? await adminDb.getAll(...clsIds.map((i) => base.collection("classes").doc(i))) : [];
  const cls = Object.fromEntries(clsDocs.map((d) => [d.id, d.data()?.name]));
  const sec = Object.fromEntries(secDocs.map((d) => [d.id, `${cls[d.data()?.classId] || ""} – ${d.data()?.name || ""}`]));
  const sub = Object.fromEntries(subDocs.map((d) => [d.id, d.data()?.name]));

  const employee = {
    id: snap.id, status: e.status, firstName: e.firstName, lastName: e.lastName, gender: e.gender, phone: e.phone, email: e.email || "",
    address: e.address, staffType: e.staffType, departmentId: e.departmentId || "", designation: e.designation, qualification: e.qualification || "", joinDate: e.joinDate,
  };
  const row = (k, v) => (<div className="flex justify-between gap-4 py-1.5"><dt className="text-slate-500">{k}</dt><dd className="text-right font-medium">{v || "—"}</dd></div>);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href={`/${tenantSlug}/dashboard/teachers`} className="text-sm text-blue-600 hover:underline">← Teachers &amp; staff</Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{e.firstName} {e.lastName}</h1>
        <p className="font-mono text-xs text-slate-500">{e.staffId} · {e.status === "ACTIVE" ? "Active" : "Inactive"}</p>
      </div>

      <section className={card}>
        <h2 className="mb-2 text-base font-semibold">Details</h2>
        <dl className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
          {row("Campus", ctx.campuses.find((c) => c.id === e.campusId)?.name)}
          {row("Type", STAFF_TYPES.find((t) => t.value === e.staffType)?.label)}
          {row("Designation", e.designation)}{row("Department", dept)}
          {row("Gender", GENDERS.find((g) => g.value === e.gender)?.label)}
          {row("Phone", e.phone)}{row("Email", e.email)}{row("Address", e.address)}
          {row("Qualification", e.qualification)}{row("Joined", e.joinDate)}
          {e.statusReason && row("Status reason", e.statusReason)}
        </dl>
      </section>

      {e.staffType === "TEACHING" && (
        <section className={card}>
          <h2 className="mb-2 text-base font-semibold">Teaching load</h2>
          {assigns.length === 0 && ctSnap.empty ? <p className="text-sm text-slate-500">No class assignments.</p> : (
            <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
              {ctSnap.docs.map((d) => <li key={d.id} className="py-2">Class teacher · <span className="font-medium">{sec[d.id]}</span></li>)}
              {assigns.map((a) => <li key={`${a.sectionId}_${a.subjectId}`} className="py-2"><span className="font-medium">{sub[a.subjectId] || "—"}</span> · {sec[a.sectionId] || "—"}</li>)}
            </ul>
          )}
        </section>
      )}

      <EmployeeActions slug={tenantSlug} employee={employee} canManage={canManage} departments={departments.filter((d) => d.status === "ACTIVE" || d.id === e.departmentId)} />
    </div>
  );
}
