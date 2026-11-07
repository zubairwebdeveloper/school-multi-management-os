import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { PERMISSIONS as P } from "@/lib/permissions";
import { StatusBadge } from "@/components/academics/shared";

export const metadata = { title: "Students" };
export const dynamic = "force-dynamic";

const PAGE = 25;

export default async function StudentsPage({ params, searchParams }) {
  const { tenantSlug } = await params;
  const sp = await searchParams;
  const ctx = await getTenantContext(tenantSlug);
  if (!ctx.permissions.includes(P.STUDENTS_READ)) notFound();

  const term = String(sp.q || "").trim().slice(0, 60);
  const status = ["ACTIVE", "WITHDRAWN", "GRADUATED", "ALL"].includes(sp.status) ? sp.status : "ACTIVE";
  const after = typeof sp.after === "string" && /^[A-Za-z0-9]{10,40}$/.test(sp.after) ? sp.after : null;
  const col = adminDb.collection(`tenants/${ctx.tenantId}/students`);

  let rows = [];
  let next = null;
  // Campus restriction is applied on the server from the validated campus selection.
  const canQuery = ctx.selectedCampusId !== "NONE";
  if (canQuery) {
    let q = col;
    if (ctx.selectedCampusId !== "ALL") q = q.where("campusId", "==", ctx.selectedCampusId);
    if (status !== "ALL") q = q.where("status", "==", status);

    if (term) {
      const isAdm = /^adm/i.test(term);
      const field = isAdm ? "admissionNumber" : "nameLower";
      const t = isAdm ? term.toUpperCase() : term.toLowerCase();
      q = q.orderBy(field).endAt(t + "\uf8ff");
      q = after ? q.startAfter(await col.doc(after).get()) : q.startAt(t);
    } else {
      q = q.orderBy("admissionNumber", "desc");
      if (after) q = q.startAfter(await col.doc(after).get());
    }
    const snap = await q.limit(PAGE).get();
    rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    if (snap.docs.length === PAGE) next = snap.docs[snap.docs.length - 1].id;
  }

  // Resolve class/section names for this page only.
  const ids = (k, c) => [...new Set(rows.map((r) => r[k]).filter(Boolean))].map((i) => adminDb.doc(`tenants/${ctx.tenantId}/${c}/${i}`));
  const [cDocs, sDocs] = await Promise.all([
    ids("classId", "classes").length ? adminDb.getAll(...ids("classId", "classes")) : [],
    ids("sectionId", "sections").length ? adminDb.getAll(...ids("sectionId", "sections")) : [],
  ]);
  const cName = Object.fromEntries(cDocs.map((d) => [d.id, d.data()?.name]));
  const sName = Object.fromEntries(sDocs.map((d) => [d.id, d.data()?.name]));
  const campusName = Object.fromEntries(ctx.campuses.map((c) => [c.id, c.name]));

  const qs = (o) => {
    const u = new URLSearchParams({ ...(term ? { q: term } : {}), status, ...o });
    return `/${tenantSlug}/dashboard/students?${u.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Students</h1>
          <p className="mt-1 text-sm text-slate-500">{ctx.selectedCampusId === "ALL" ? "All campuses" : campusName[ctx.selectedCampusId]}</p>
        </div>
        {ctx.permissions.includes(P.STUDENTS_CREATE) && (
          <Link href={`/${tenantSlug}/dashboard/students/new`} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">Admit student</Link>
        )}
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3" role="search">
        <div>
          <label htmlFor="q" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Name or admission number (starts with)</label>
          <input id="q" name="q" defaultValue={term} className="w-64 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
        </div>
        <div>
          <label htmlFor="status" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Status</label>
          <select id="status" name="status" defaultValue={status} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
            <option value="ACTIVE">Active</option><option value="WITHDRAWN">Withdrawn</option>
            <option value="GRADUATED">Graduated</option><option value="ALL">All</option>
          </select>
        </div>
        <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Search</button>
      </form>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700">
          {term || status !== "ACTIVE" ? "No students match this search." : "No students yet."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50">
              <tr><th className="px-4 py-2">Admission no.</th><th className="px-4">Name</th><th className="px-4">Class</th>
                {ctx.selectedCampusId === "ALL" && <th className="px-4">Campus</th>}<th className="px-4">Status</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-2 font-mono text-xs">{r.admissionNumber}</td>
                  <td className="px-4"><Link href={`/${tenantSlug}/dashboard/students/${r.id}`} className="font-medium text-blue-600 hover:underline">{r.firstName} {r.lastName}</Link></td>
                  <td className="px-4">{cName[r.classId] || "—"}{sName[r.sectionId] ? ` – ${sName[r.sectionId]}` : ""}</td>
                  {ctx.selectedCampusId === "ALL" && <td className="px-4">{campusName[r.campusId] || "—"}</td>}
                  <td className="px-4"><StatusBadge status={r.status === "WITHDRAWN" ? "CLOSED" : r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex gap-4 text-sm">
        {after && <Link href={qs({})} className="text-blue-600 hover:underline">← First page</Link>}
        {next && <Link href={qs({ after: next })} className="text-blue-600 hover:underline">Next page →</Link>}
      </div>
    </div>
  );
}
