import { notFound } from "next/navigation";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { resolveCampus } from "@/lib/tenant/resolveCampus";
import { getTenantSettings } from "@/lib/tenant/getSettings";
import { PERMISSIONS as P } from "@/lib/permissions";
import { todayInZone } from "@/lib/utils/dates";
import FeesTabs from "@/components/fees/FeesTabs";
import QuerySelect from "@/components/timetable/QuerySelect";
import ReminderPanel from "@/components/fees/ReminderPanel";
import { overdueByStudent } from "../reminders-actions";

export const metadata = { title: "Fee reminders" };
export const dynamic = "force-dynamic";

export default async function RemindersPage({ params, searchParams }) {
  const { tenantSlug } = await params;
  const sp = await searchParams;
  const ctx = await getTenantContext(tenantSlug);
  if (!ctx.permissions.includes(P.FEES_MANAGE)) notFound();

  const campusId = resolveCampus(ctx, sp.campus);
  const { timezone, currency } = await getTenantSettings(ctx.tenantId);
  const list = campusId ? await overdueByStudent(ctx.tenantId, campusId, todayInZone(timezone), currency) : [];

  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">Fees</h1>
      <FeesTabs slug={tenantSlug} active="reminders" canManage canFinance={ctx.permissions.includes(P.FINANCE_READ)} />
      {ctx.selectedCampusId === "ALL" && ctx.campuses.length > 1 && (
        <QuerySelect basePath={`/${tenantSlug}/dashboard/fees/reminders`} name="campus" label="Campus" value={campusId} options={ctx.campuses.map((c) => ({ value: c.id, label: c.name }))} />
      )}
      {list.length === 0 ? <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500 dark:border-slate-700">No active student has overdue invoices in this campus.</p> : (
        <>
          <ReminderPanel slug={tenantSlug} campusId={campusId} count={list.length} />
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50"><tr><th className="px-4 py-2">Student</th><th className="px-4 text-right">Overdue invoices</th><th className="px-4 text-right">Overdue balance</th></tr></thead>
              <tbody>{list.slice(0, 100).map((s) => (<tr key={s.studentId} className="border-t border-slate-100 dark:border-slate-800"><td className="px-4 py-2">{s.name} <span className="font-mono text-xs text-slate-500">{s.adm}</span></td><td className="px-4 text-right">{s.count}</td><td className="px-4 text-right font-medium">{s.text}</td></tr>))}</tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
