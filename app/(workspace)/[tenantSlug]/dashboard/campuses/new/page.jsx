import { notFound } from "next/navigation";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { PERMISSIONS as P } from "@/lib/permissions";
import CampusForm from "@/components/campuses/CampusForm";

export const metadata = { title: "Add campus" };

export default async function NewCampusPage({ params }) {
  const { tenantSlug } = await params;
  const ctx = await getTenantContext(tenantSlug);
  if (!ctx.permissions.includes(P.CAMPUS_MANAGE) || !ctx.orgWide) notFound();

  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Add campus</h1>
      <CampusForm slug={tenantSlug} />
    </div>
  );
}
