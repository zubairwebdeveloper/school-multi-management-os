import Link from "next/link";
import { adminDb } from "@/lib/firebase/admin";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { PERMISSIONS as P } from "@/lib/permissions";
import { CAMPUS_TYPES } from "@/lib/validations/campus";
import { notFound } from "next/navigation";

export const metadata = { title: "Campuses" };

export default async function CampusesPage({ params }) {
  const { tenantSlug } = await params;
  const ctx = await getTenantContext(tenantSlug);
  if (!ctx.permissions.includes(P.CAMPUS_VIEW)) notFound();

  const canManage = ctx.permissions.includes(P.CAMPUS_MANAGE);
  const canCreate = canManage && ctx.orgWide;

  // Org-wide roles see every campus (including inactive); others only their own.
  const snap = await adminDb.collection(`tenants/${ctx.tenantId}/campuses`).get();
  const allowed = new Set(ctx.campuses.map((c) => c.id));
  const rows = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((c) => ctx.orgWide || allowed.has(c.id))
    .sort((a, b) => Number(!!b.isPrimary) - Number(!!a.isPrimary) || a.name.localeCompare(b.name));

  const typeLabel = Object.fromEntries(CAMPUS_TYPES.map((t) => [t.value, t.label]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Campuses</h1>
          <p className="mt-1 text-sm text-slate-500">{rows.length} campus{rows.length === 1 ? "" : "es"}</p>
        </div>
        {canCreate && (
          <Link href={`/${tenantSlug}/dashboard/campuses/new`}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700">
            Add campus
          </Link>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700">
          No campuses yet.
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {rows.map((c) => (
            <li key={c.id} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{c.name}</h2>
                  <p className="text-xs text-slate-500">
                    {[c.code, typeLabel[c.campusType], c.city].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex gap-1.5">
                  {c.isPrimary && <span className="rounded-full bg-[#D6B36A]/20 px-2 py-0.5 text-xs font-medium text-[#8a6d2b]">Primary</span>}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    c.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                  }`}>{c.status === "ACTIVE" ? "Active" : "Inactive"}</span>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">{c.address}</p>
              <p className="text-sm text-slate-600 dark:text-slate-400">{c.phone}</p>
              {canManage && (ctx.orgWide || allowed.has(c.id)) && (
                <Link href={`/${tenantSlug}/dashboard/campuses/${c.id}`} className="mt-4 inline-block text-sm font-medium text-blue-600 hover:underline">
                  Edit
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
