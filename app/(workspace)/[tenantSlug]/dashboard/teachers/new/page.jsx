import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { PERMISSIONS as P } from "@/lib/permissions";
import EmployeeForm from "@/components/staff/EmployeeForm";

export const metadata = { title: "Add staff member" };
export const dynamic = "force-dynamic";

export default async function NewStaffPage({ params }) {
  const { tenantSlug } = await params;
  const ctx = await getTenantContext(tenantSlug);
  if (!ctx.permissions.includes(P.STAFF_MANAGE)) notFound();

  const snap = await adminDb.collection(`tenants/${ctx.tenantId}/departments`).where("status", "==", "ACTIVE").get();
  const departments = snap.docs.map((d) => ({ id: d.id, name: d.data().name })).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Add staff member</h1>
      <EmployeeForm slug={tenantSlug} campuses={ctx.campuses.map((c) => ({ id: c.id, name: c.name }))} departments={departments}
        defaultCampusId={ctx.selectedCampusId !== "ALL" && ctx.selectedCampusId !== "NONE" ? ctx.selectedCampusId : ""} />
    </div>
  );
}
