"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { card, ghostBtn, inputCls, primaryBtn } from "@/components/academics/shared";
import { DEFAULT_BANDS } from "@/lib/validations/exams";
import { createGradingSystem } from "@/app/(workspace)/[tenantSlug]/dashboard/examinations/actions";

export default function GradingManager({ slug, systems, canManage }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [bands, setBands] = useState(DEFAULT_BANDS.map((b) => ({ ...b })));
  const [busy, setBusy] = useState(false);
  const patch = (i, p) => setBands((bs) => bs.map((b, j) => (j === i ? { ...b, ...p } : b)));

  async function save() {
    setBusy(true);
    try {
      const res = await createGradingSystem(slug, { name, bands });
      if (res.ok) { toast.success(res.message); setName(""); router.refresh(); } else toast.error(res.error);
    } catch { toast.error("Something went wrong. Please try again."); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-6">
      {canManage && (
        <section className={card}>
          <h2 className="mb-1 text-base font-semibold">New grading scale</h2>
          <p className="mb-3 text-xs text-slate-500">A suggested starting point is filled in. Adjust it to your board or school policy. List grades from highest to lowest; the lowest must start at 0%. Scales cannot be edited later; create a new one instead.</p>
          <div className="mb-3 max-w-sm">
            <label htmlFor="gs-name" className="mb-1 block text-xs font-medium">Name</label>
            <input id="gs-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Standard scale" />
          </div>
          <ul className="space-y-2">
            {bands.map((b, i) => (
              <li key={i} className="grid max-w-md grid-cols-[1fr_1fr_auto] items-end gap-2">
                <div><label htmlFor={`gb-g-${i}`} className="mb-1 block text-xs font-medium">Grade</label><input id={`gb-g-${i}`} className={inputCls} value={b.grade} maxLength={4} onChange={(e) => patch(i, { grade: e.target.value })} /></div>
                <div><label htmlFor={`gb-m-${i}`} className="mb-1 block text-xs font-medium">From % (inclusive)</label><input id={`gb-m-${i}`} inputMode="numeric" className={inputCls} value={b.min} onChange={(e) => patch(i, { min: e.target.value })} /></div>
                <button type="button" className={ghostBtn} disabled={bands.length <= 2} onClick={() => setBands((bs) => bs.filter((_, j) => j !== i))}>Remove</button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <button type="button" className={ghostBtn} disabled={bands.length >= 12} onClick={() => setBands((bs) => [...bs, { grade: "", min: "" }])}>Add grade</button>
            <button type="button" className={primaryBtn} disabled={busy || !name} onClick={save}>{busy ? "Saving…" : "Save scale"}</button>
          </div>
        </section>
      )}
      <section className={card}>
        <h2 className="mb-2 text-base font-semibold">Grading scales</h2>
        {systems.length === 0 ? <p className="text-sm text-slate-500">None yet. Create one before setting up an exam.</p> : (
          <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {systems.map((s) => (
              <li key={s.id} className="py-2.5"><span className="font-medium">{s.name}</span><br /><span className="text-slate-500">{s.bands.map((b) => `${b.grade} ≥ ${b.min}%`).join(" · ")}</span></li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
