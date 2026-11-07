"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ActionForm, ConfirmButton, StatusBadge, card, ghostBtn, inputCls, primaryBtn } from "@/components/academics/shared";
import { FREQUENCIES } from "@/lib/validations/fees";
import { createFeeCategory, saveFeeStructure, setFeeCategoryStatus } from "@/app/(workspace)/[tenantSlug]/dashboard/fees/actions";

function StructureEditor({ slug, classes, categories, structures }) {
  const router = useRouter();
  const [classId, setClassId] = useState(classes[0]?.id || "");
  const initial = (id) => (structures[id] || [{ categoryId: "", amount: "", frequency: "MONTHLY" }]).map((l) => ({ ...l }));
  const [lines, setLines] = useState(() => initial(classes[0]?.id));
  const [busy, setBusy] = useState(false);
  const patch = (i, p) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...p } : l)));
  const active = categories.filter((c) => c.status === "ACTIVE");

  async function save() {
    setBusy(true);
    try {
      const res = await saveFeeStructure(slug, { classId, lines });
      if (res.ok) { toast.success(res.message); router.refresh(); } else toast.error(res.error);
    } catch { toast.error("Something went wrong. Please try again."); }
    finally { setBusy(false); }
  }

  if (!classes.length) return <p className="text-sm text-slate-500">Create classes first.</p>;
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="fs-class" className="mb-1 block text-xs font-medium">Class</label>
        <select id="fs-class" className={`${inputCls} max-w-sm`} value={classId} onChange={(e) => { setClassId(e.target.value); setLines(initial(e.target.value)); }}>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>
      <ul className="space-y-3">
        {lines.map((l, i) => (
          <li key={i} className="grid items-end gap-2 sm:grid-cols-[1fr_9rem_9rem_auto]">
            <div><label htmlFor={`fl-c-${i}`} className="mb-1 block text-xs font-medium">Category</label>
              <select id={`fl-c-${i}`} className={inputCls} value={l.categoryId} onChange={(e) => patch(i, { categoryId: e.target.value })}>
                <option value="" disabled>Select…</option>{active.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></div>
            <div><label htmlFor={`fl-a-${i}`} className="mb-1 block text-xs font-medium">Amount</label>
              <input id={`fl-a-${i}`} inputMode="decimal" className={inputCls} value={l.amount} placeholder="e.g. 5000" onChange={(e) => patch(i, { amount: e.target.value })} /></div>
            <div><label htmlFor={`fl-f-${i}`} className="mb-1 block text-xs font-medium">Frequency</label>
              <select id={`fl-f-${i}`} className={inputCls} value={l.frequency} onChange={(e) => patch(i, { frequency: e.target.value })}>
                {FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select></div>
            <button type="button" className={ghostBtn} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} disabled={lines.length === 1}>Remove</button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <button type="button" className={ghostBtn} disabled={lines.length >= 20} onClick={() => setLines((ls) => [...ls, { categoryId: "", amount: "", frequency: "MONTHLY" }])}>Add line</button>
        <button type="button" className={primaryBtn} disabled={busy} onClick={save}>{busy ? "Saving…" : "Save structure"}</button>
      </div>
      <p className="text-xs text-slate-500">Saving replaces this class's structure for the active session. Invoices already generated keep their own amounts.</p>
    </div>
  );
}

export default function FeeSetup({ slug, categories, classes, structures, canManageOrg }) {
  return (
    <div className="space-y-6">
      <section className={card}>
        <h2 className="mb-3 text-base font-semibold">Fee categories</h2>
        {canManageOrg && <div className="mb-4"><ActionForm cols={1} fields={[{ name: "name", label: "New category", placeholder: "e.g. Tuition, Admission, Exam, Transport" }]} submitLabel="Add category" onSubmit={(v) => createFeeCategory(slug, v)} /></div>}
        {categories.length === 0 ? <p className="text-sm text-slate-500">No categories yet.</p> : (
          <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2">
                <span>{c.name} {c.status !== "ACTIVE" && <StatusBadge status={c.status} />}</span>
                {canManageOrg && (c.status === "ACTIVE"
                  ? <ConfirmButton confirm={`Archive ${c.name}?`} run={() => setFeeCategoryStatus(slug, c.id, "ARCHIVED")}>Archive</ConfirmButton>
                  : <ConfirmButton run={() => setFeeCategoryStatus(slug, c.id, "ACTIVE")}>Restore</ConfirmButton>)}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className={card}>
        <h2 className="mb-3 text-base font-semibold">Class fee structure</h2>
        <StructureEditor key={classes.map((c) => c.id).join()} slug={slug} classes={classes} categories={categories} structures={structures} />
      </section>
    </div>
  );
}
