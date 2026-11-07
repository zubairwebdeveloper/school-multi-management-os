"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { card, primaryBtn } from "@/components/academics/shared";
import { saveAlertSettings } from "@/app/(workspace)/[tenantSlug]/dashboard/communications/settings-actions";

export default function AlertSettings({ slug, settings, canEdit, emailConfigured }) {
  const router = useRouter();
  const [v, setV] = useState(settings);
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try { const r = await saveAlertSettings(slug, v); r.ok ? toast.success(r.message) : toast.error(r.error); router.refresh(); }
    catch { toast.error("Something went wrong. Please try again."); }
    finally { setBusy(false); }
  }
  const row = (k, title, hint, disabled = false) => (
    <label className="flex items-start gap-3 text-sm">
      <input type="checkbox" className="mt-1" checked={v[k]} disabled={!canEdit || busy || disabled} onChange={(e) => setV({ ...v, [k]: e.target.checked })} />
      <span><span className="font-medium">{title}</span><span className="block text-xs text-slate-500">{hint}</span></span>
    </label>
  );
  return (
    <section className={card}>
      <h2 className="mb-1 text-base font-semibold">Automatic parent alerts</h2>
      <p className="mb-3 text-xs text-slate-500">In-app only unless email is switched on below. Parents without a portal login cannot be reached.</p>
      <div className="space-y-3">
        {row("absenceAlerts", "Absence alerts", "When a student is marked absent today, the parents are told once.")}
        {row("resultAlerts", "Result alerts", "When an exam's results are published, the parents are told once.")}
        {row("autoEmail", "Also email these alerts", emailConfigured ? "Only to parents who have not opted out; up to 100 emails per event." : "Email is not configured on the server, so nothing would be sent.", !emailConfigured)}
      </div>
      {canEdit ? <button className={`${primaryBtn} mt-4`} disabled={busy} onClick={save}>{busy ? "Saving…" : "Save"}</button> : <p className="mt-3 text-xs text-slate-500">Only an organization-wide administrator can change these.</p>}
    </section>
  );
}
