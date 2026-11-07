import Link from "next/link";
import { notFound } from "next/navigation";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { PERMISSIONS as P } from "@/lib/permissions";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage({ params }) {
  const { tenantSlug } = await params;
  const ctx = await getTenantContext(tenantSlug);
  if (!ctx.permissions.includes(P.SETTINGS_MANAGE)) notFound();

  const items = [
    { href: `/${tenantSlug}/dashboard/settings/team`, title: "Team & access", body: "Invite staff, assign roles and campuses, suspend access." },
    { href: `/${tenantSlug}/dashboard/settings/parent-access`, title: "Parent portal access", body: "Invite guardians to the parent portal, suspend or restore their access." },
  ];
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <ul className="grid gap-4 sm:grid-cols-2">
        {items.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="block rounded-xl border border-slate-200 bg-white p-5 hover:border-blue-400 dark:border-slate-800 dark:bg-slate-900">
              <h2 className="font-semibold">{i.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{i.body}</p>
            </Link>
          </li>
        ))}
        <li className="rounded-xl border border-dashed border-slate-300 p-5 text-sm text-slate-500 dark:border-slate-700">
          Organization profile, branding and academic defaults are planned in a later batch.
        </li>
      </ul>
    </div>
  );
}
