"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DAYS } from "@/lib/utils/weekday";
import { card, inputCls, primaryBtn, ghostBtn, ConfirmButton } from "@/components/academics/shared";
import { savePeriods, setPublished } from "@/app/(workspace)/[tenantSlug]/dashboard/timetables/actions";

export default function PeriodsEditor({ slug, campusId, initialDays, initialPeriods, status, isNew, canManage }) {
  const router = useRouter();
  const [days, setDays] = useState(initialDays);
  const [periods, setPeriods] = useState(initialPeriods);
  const [busy, setBusy] = useState(false);
  const patch = (i, p) => setPeriods((ps) => ps.map((x, j) => (j === i ? { ...x, ...p } : x)));

  async function save() {
    setBusy(true);
    try {
      const res = await savePeriods(slug, { campusId, days, periods });
      if (res.ok) { toast.success(res.message); router.refresh(); } else toast.error(res.error);
    } catch { toast.error("Something went wrong. Please try again."); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      {isNew && <p className="rounded-lg bg-slate-100 p-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">This is a suggested starting point. Adjust it to your school's day, then save.</p>}
      <section className={card}>
        <h2 className="mb-3 text-base font-semibold">School days</h2>
        <div className="flex flex-wrap gap-4">
          {DAYS.map((d) => (
            <label key={d.value} className="flex items-center gap-2 text-sm">
              <input type="checkbox" disabled={!canManage} checked={days.includes(d.value)}
                onChange={(e) => setDays((v) => (e.target.checked ? [...v, d.value].sort() : v.filter((x) => x !== d.value)))} />
              {d.label}
            </label>
          ))}
        </div>
      </section>

      <section className={card}>
        <h2 className="mb-3 text-base font-semibold">Periods</h2>
        <ul className="space-y-3">
          {periods.map((p, i) => (
            <li key={i} className="grid items-end gap-2 sm:grid-cols-[1fr_7rem_7rem_auto_auto]">
              <div><label htmlFor={`pn-${i}`} className="mb-1 block text-xs font-medium">Name</label>
                <input id={`pn-${i}`} className={inputCls} value={p.name} disabled={!canManage} onChange={(e) => patch(i, { name: e.target.value })} /></div>
              <div><label htmlFor={`ps-${i}`} className="mb-1 block text-xs font-medium">Start</label>
                <input id={`ps-${i}`} type="time" className={inputCls} value={p.start} disabled={!canManage} onChange={(e) => patch(i, { start: e.target.value })} /></div>
              <div><label htmlFor={`pe-${i}`} className="mb-1 block text-xs font-medium">End</label>
                <input id={`pe-${i}`} type="time" className={inputCls} value={p.end} disabled={!canManage} onChange={(e) => patch(i, { end: e.target.value })} /></div>
              <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" checked={p.isBreak} disabled={!canManage} onChange={(e) => patch(i, { isBreak: e.target.checked })} />Break</label>
              {canManage && <button type="button" className={ghostBtn} onClick={() => setPeriods((ps) => ps.filter((_, j) => j !== i))} aria-label={`Remove ${p.name}`}>Remove</button>}
            </li>
          ))}
        </ul>
        {canManage && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className={ghostBtn} disabled={periods.length >= 14}
              onClick={() => setPeriods((ps) => [...ps, { id: "", name: `Period ${ps.filter((x) => !x.isBreak).length + 1}`, start: ps.at(-1)?.end || "08:00", end: "", isBreak: false }])}>Add period</button>
            <button type="button" className={primaryBtn} disabled={busy} onClick={save}>{busy ? "Saving…" : "Save periods"}</button>
          </div>
        )}
      </section>

      {!isNew && (
        <section className={card}>
          <h2 className="text-base font-semibold">Publishing</h2>
          <p className="mb-3 mt-1 text-sm text-slate-500">Status: <strong>{status === "PUBLISHED" ? "Published" : "Draft"}</strong>. Changes after publishing are still allowed and are audited.</p>
          {canManage && (status === "PUBLISHED"
            ? <ConfirmButton confirm="Move this timetable back to draft?" run={() => setPublished(slug, { campusId, published: false })}>Unpublish</ConfirmButton>
            : <ConfirmButton confirm="Publish this campus timetable?" run={() => setPublished(slug, { campusId, published: true })} className={primaryBtn}>Publish</ConfirmButton>)}
        </section>
      )}
    </div>
  );
}
