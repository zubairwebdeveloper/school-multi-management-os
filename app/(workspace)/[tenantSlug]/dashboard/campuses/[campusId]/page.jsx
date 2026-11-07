import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { PERMISSIONS as P } from "@/lib/permissions";
import CampusForm from "@/components/campuses/CampusForm";
import CampusStatusButton from "@/components/campuses/CampusStatusButton";

export const metadata = { title: "Edit campus" };

export default async function EditCampusPage({ params }) {
  const { tenantSlug, campusId } = await params;
  const ctx = await getTenantContext(tenantSlug);
  if (!ctx.permissions.includes(P.CAMPUS_MANAGE)) notFound();
  if (!ctx.orgWide && !ctx.campuses.some((c) => c.id === campusId)) notFound();

  const snap = await adminDb.doc(`tenants/${ctx.tenantId}/campuses/${campusId}`).get();
  if (!snap.exists) notFound();
  const d = snap.data();

  // Pass only plain, non-sensitive fields to the client component.
  const campus = {
    id: snap.id, name: d.name, code: d.code || "", campusType: d.campusType || "MIXED",
    city: d.city || "", address: d.address || "", phone: d.phone || "", email: d.email || "", notes: d.notes || "",
  };

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Edit campus</h1>
        {ctx.orgWide && !d.isPrimary && (
          <CampusStatusButton slug={tenantSlug} campusId={snap.id} campusName={d.name} status={d.status} />
        )}
      </div>
      {d.status !== "ACTIVE" && (
        <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">This campus is inactive.</p>
      )}
      <CampusForm slug={tenantSlug} campus={campus} />
    </div>
  );
}
