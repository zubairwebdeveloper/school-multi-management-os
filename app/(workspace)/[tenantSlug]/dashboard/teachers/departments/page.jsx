import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { PERMISSIONS as P } from "@/lib/permissions";
import StaffTabs from "@/components/staff/StaffTabs";
import DepartmentManager from "@/components/staff/DepartmentManager";

export const metadata = { title: "Departments" };
export const dynamic = "force-dynamic";

export default async function DepartmentsPage({ params }) {
  const { tenantSlug } = await params;
  const ctx = await getTenantContext(tenantSlug);
  if (!ctx.permissions.includes(P.STAFF_READ)) notFound();

  const base = adminDb.doc(`tenants/${ctx.tenantId}`);
  const [dSnap, eSnap] = await Promise.all([
    base.collection("departments").orderBy("name").get(),
    base.collection("employees").where("status", "==", "ACTIVE").get(),
  ]);
  const allowed = new Set(ctx.campuses.map((c) => c.id));
  const counts = {};
  eSnap.docs.forEach((d) => { const x = d.data(); if (ctx.orgWide || allowed.has(x.campusId)) counts[x.departmentId] = (counts[x.departmentId] || 0) + 1; });
  const departments = dSnap.docs.map((d) => ({ id: d.id, name: d.data().name, code: d.data().code || "", status: d.data().status, staffCount: counts[d.id] || 0 }));

  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">Teachers &amp; staff</h1>
      <StaffTabs slug={tenantSlug} active="departments" />
      <DepartmentManager slug={tenantSlug} departments={departments} canManage={ctx.permissions.includes(P.STAFF_MANAGE) && ctx.orgWide} />
    </div>
  );
}
