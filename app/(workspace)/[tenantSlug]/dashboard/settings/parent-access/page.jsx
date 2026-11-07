import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { PERMISSIONS as P } from "@/lib/permissions";
import { RELATIONSHIPS } from "@/lib/validations/students";
import ParentAccessManager from "@/components/parent/ParentAccessManager";

export const metadata = { title: "Parent portal access" };
export const dynamic = "force-dynamic";

export default async function ParentAccessPage({ params, searchParams }) {
  const { tenantSlug } = await params;
  const sp = await searchParams;
  const ctx = await getTenantContext(tenantSlug);
  if (!ctx.permissions.includes(P.STUDENTS_UPDATE) && !ctx.permissions.includes(P.SETTINGS_MANAGE)) notFound();

  const adm = String(sp.adm || "").trim().toUpperCase().slice(0, 20);
  const base = adminDb.doc(`tenants/${ctx.tenantId}`);
  let body = null;

  if (adm) {
    const sSnap = await base.collection("students").where("admissionNumber", "==", adm).limit(1).get();
    const stu = sSnap.docs[0];
    if (!stu || (!ctx.orgWide && !ctx.campuses.some((c) => c.id === stu.data().campusId))) {
      body = <p className="text-sm text-slate-500">No student found with that admission number.</p>;
    } else {
      const links = (await base.collection("studentGuardians").where("studentId", "==", stu.id).get()).docs.map((d) => d.data());
      const gDocs = links.length ? await adminDb.getAll(...links.map((l) => base.collection("guardians").doc(l.guardianId))) : [];
      const [pend, memDocs] = await Promise.all([
        base.collection("invitations").where("kind", "==", "GUARDIAN").where("status", "==", "PENDING").get(),
        gDocs.some((g) => g.data()?.linkedUid) ? adminDb.getAll(...gDocs.filter((g) => g.data()?.linkedUid).map((g) => base.collection("members").doc(g.data().linkedUid))) : [],
      ]);
      const pendingBy = Object.fromEntries(pend.docs.map((d) => [d.data().guardianId, d.id]));
      const memStatus = Object.fromEntries(memDocs.map((m) => [m.id, m.data()?.status]));
      const relLabel = Object.fromEntries(RELATIONSHIPS.map((r) => [r.value, r.label]));

      const guardians = gDocs.map((d, i) => {
        const g = d.data() || {};
        const portal = g.linkedUid ? (memStatus[g.linkedUid] === "ACTIVE" ? "ACTIVE" : "SUSPENDED") : pendingBy[d.id] ? "INVITED" : "NONE";
        return { id: d.id, fullName: g.fullName, phone: g.phone, email: g.email || "", relationship: relLabel[links[i].relationship] || links[i].relationship, portal, inviteId: pendingBy[d.id] || "" };
      });
      body = <ParentAccessManager slug={tenantSlug} student={{ id: stu.id, name: `${stu.data().firstName} ${stu.data().lastName}`, adm: stu.data().admissionNumber }} guardians={guardians} />;
    }
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <Link href={`/${tenantSlug}/dashboard/settings`} className="text-sm text-blue-600 hover:underline">← Settings</Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Parent portal access</h1>
        <p className="mt-1 text-sm text-slate-500">Parents see only the children linked to their guardian record. One parent login covers all their children.</p>
      </div>
      <form method="get" role="search" className="flex items-end gap-3">
        <div>
          <label htmlFor="adm" className="mb-1 block text-xs font-medium">Student admission number</label>
          <input id="adm" name="adm" defaultValue={adm} placeholder="ADM-00001" className="w-48 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
        </div>
        <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Find</button>
      </form>
      {body}
    </div>
  );
}
