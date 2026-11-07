import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { PERMISSIONS as P } from "@/lib/permissions";
import { STAFF_TYPES } from "@/lib/validations/staff";
import StaffTabs from "@/components/staff/StaffTabs";

export const metadata = { title: "Teachers & staff" };
export const dynamic = "force-dynamic";

export default async function StaffPage({ params, searchParams }) {
  const { tenantSlug } = await params;
  const sp = await searchParams;
  const ctx = await getTenantContext(tenantSlug);
  if (!ctx.permissions.includes(P.STAFF_READ)) notFound();

  const term = String(sp.q || "").trim().toLowerCase().slice(0, 60);
  const status = ["ACTIVE", "INACTIVE", "ALL"].includes(sp.status) ? sp.status : "ACTIVE";
  const type = ["TEACHING", "NON_TEACHING", "ALL"].includes(sp.type) ? sp.type : "ALL";
  const base = adminDb.doc(`tenants/${ctx.tenantId}`);

  let rows = [];
  if (ctx.selectedCampusId !== "NONE") {
    let q = base.collection("employees");
    if (ctx.selectedCampusId !== "ALL") q = q.where("campusId", "==", ctx.selectedCampusId);
    // Staff lists are small (hundreds), so filtering/sorting in memory is fine here.
    rows = (await q.limit(500).get()).docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  rows = rows
    .filter((r) => (status === "ALL" || r.status === status) && (type === "ALL" || r.staffType === type) && (!term || r.nameLower.includes(term) || r.staffId.toLowerCase().includes(term)))
    .sort((a, b) => a.nameLower.localeCompare(b.nameLower));

  const depts = Object.fromEntries((await base.collection("departments").get()).docs.map((d) => [d.id, d.data().name]));
  const campusName = Object.fromEntries(ctx.campuses.map((c) => [c.id, c.name]));
  const typeLabel = Object.fromEntries(STAFF_TYPES.map((t) => [t.value, t.label]));
  const sel = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Teachers &amp; staff</h1>
        {ctx.permissions.includes(P.STAFF_MANAGE) && (
          <Link href={`/${tenantSlug}/dashboard/teachers/new`} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Add staff member</Link>
        )}
      </div>
      <StaffTabs slug={tenantSlug} active="staff" />

      <form method="get" role="search" className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="q" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Name or staff ID</label>
          <input id="q" name="q" defaultValue={sp.q || ""} className={`${sel} w-56`} />
        </div>
        <div>
          <label htmlFor="type" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Type</label>
          <select id="type" name="type" defaultValue={type} className={sel}><option value="ALL">All</option><option value="TEACHING">Teaching</option><option value="NON_TEACHING">Non-teaching</option></select>
        </div>
        <div>
          <label htmlFor="status" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Status</label>
          <select id="status" name="status" defaultValue={status} className={sel}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="ALL">All</option></select>
        </div>
        <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Filter</button>
      </form>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700">No staff match.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50">
              <tr><th className="px-4 py-2">Staff ID</th><th className="px-4">Name</th><th className="px-4">Designation</th><th className="px-4">Department</th><th className="px-4">Type</th>
                {ctx.selectedCampusId === "ALL" && <th className="px-4">Campus</th>}<th className="px-4">Status</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-2 font-mono text-xs">{r.staffId}</td>
                  <td className="px-4"><Link href={`/${tenantSlug}/dashboard/teachers/${r.id}`} className="font-medium text-blue-600 hover:underline">{r.firstName} {r.lastName}</Link></td>
                  <td className="px-4">{r.designation}</td><td className="px-4">{depts[r.departmentId] || "—"}</td><td className="px-4">{typeLabel[r.staffType]}</td>
                  {ctx.selectedCampusId === "ALL" && <td className="px-4">{campusName[r.campusId] || "—"}</td>}
                  <td className="px-4"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{r.status === "ACTIVE" ? "Active" : "Inactive"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
