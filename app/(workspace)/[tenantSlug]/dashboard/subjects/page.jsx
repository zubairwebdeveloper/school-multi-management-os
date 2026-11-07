import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { PERMISSIONS as P } from "@/lib/permissions";
import SubjectManager from "@/components/academics/SubjectManager";

export const metadata = { title: "Subjects" };

export default async function Page({ params }) {
  const { tenantSlug } = await params;
  const ctx = await getTenantContext(tenantSlug);
  if (!ctx.permissions.includes(P.CAMPUS_VIEW)) notFound();

  const snap = await adminDb.collection(`tenants/${ctx.tenantId}/subjects`).orderBy("name").get();
  const subjects = snap.docs.map((d) => {
    const s = d.data();
    return { id: d.id, name: s.name, code: s.code || "", category: s.category, curriculum: s.curriculum, status: s.status };
  });

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Subjects</h1>
      <SubjectManager slug={tenantSlug} subjects={subjects} canManage={ctx.permissions.includes(P.ACADEMICS_MANAGE) && ctx.orgWide} />
    </div>
  );
}
