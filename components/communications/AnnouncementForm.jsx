"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AUDIENCES } from "@/lib/validations/communications";
import { card, ghostBtn, inputCls, primaryBtn } from "@/components/academics/shared";
import { createAnnouncement, sendTestEmail } from "@/app/(workspace)/[tenantSlug]/dashboard/communications/actions";

const lbl = "mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300";
const empty = { type: "", campusId: "", classId: "", sectionId: "", title: "", body: "", sendEmail: false };

export default function AnnouncementForm({ slug, campuses, classes, sections, emailConfigured }) {
  const router = useRouter();
  const [v, setV] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [last, setLast] = useState("");
  const set = (p) => setV((x) => ({ ...x, ...p }));
  const needsCampus = v.type === "PARENTS_CAMPUS" || v.type === "STAFF_CAMPUS";

  async function submit(e) {
    e.preventDefault();
    if (!window.confirm("Send this message now? It cannot be recalled.")) return;
    setBusy(true); setErrors({}); setLast("");
    try {
      const res = await createAnnouncement(slug, v);
      if (res.ok) { toast.success("Announcement sent."); setLast(res.message); setV(empty); router.refresh(); }
      else { setErrors(res.fieldErrors || {}); toast.error(res.error); }
    } catch { toast.error("Something went wrong. Please try again."); }
    finally { setBusy(false); }
  }

  async function test() {
    setBusy(true);
    try { const r = await sendTestEmail(slug); r.ok ? toast.success(r.message) : toast.error(r.error); }
    catch { toast.error("Something went wrong. Please try again."); }
    finally { setBusy(false); }
  }
  const Err = ({ k }) => (errors[k] ? <p className="mt-1 text-xs text-red-600">{errors[k][0]}</p> : null);

  return (
    <section className={card}>
      <h2 className="mb-1 text-base font-semibold">New announcement</h2>
      <p className="mb-3 text-xs text-slate-500">Plain text only. It is delivered in-app to people who already have an account. Guardians without a portal login cannot receive it.</p>
      <form onSubmit={submit} className="space-y-3" noValidate>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="an-type" className={lbl}>Send to</label>
            <select id="an-type" className={inputCls} value={v.type} onChange={(e) => set({ type: e.target.value, campusId: "", classId: "", sectionId: "" })}>
              <option value="" disabled>Select…</option>{AUDIENCES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select><Err k="type" />
          </div>
          {needsCampus && (
            <div><label htmlFor="an-campus" className={lbl}>Campus</label>
              <select id="an-campus" className={inputCls} value={v.campusId} onChange={(e) => set({ campusId: e.target.value })}><option value="" disabled>Select…</option>{campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          )}
          {v.type === "PARENTS_CLASS" && (
            <div><label htmlFor="an-class" className={lbl}>Class</label>
              <select id="an-class" className={inputCls} value={v.classId} onChange={(e) => set({ classId: e.target.value })}><option value="" disabled>Select…</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
          )}
          {v.type === "PARENTS_SECTION" && (
            <div><label htmlFor="an-sec" className={lbl}>Class &amp; section</label>
              <select id="an-sec" className={inputCls} value={v.sectionId} onChange={(e) => set({ sectionId: e.target.value })}><option value="" disabled>Select…</option>{sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
          )}
        </div>
        <div><label htmlFor="an-title" className={lbl}>Title</label><input id="an-title" className={inputCls} value={v.title} maxLength={120} onChange={(e) => set({ title: e.target.value })} /><Err k="title" /></div>
        <div><label htmlFor="an-body" className={lbl}>Message</label><textarea id="an-body" rows={5} maxLength={2000} className={inputCls} value={v.body} onChange={(e) => set({ body: e.target.value })} /><Err k="body" /></div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" disabled={!emailConfigured} checked={v.sendEmail} onChange={(e) => set({ sendEmail: e.target.checked })} />
          <span>Also send by email (only to people with accounts who have not opted out; up to 200 per announcement).{!emailConfigured && <span className="block text-xs text-amber-700">Email is not configured on the server, so it will not be sent.</span>}</span>
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy || !v.type || !v.title || !v.body} className={primaryBtn}>{busy ? "Sending…" : "Send announcement"}</button>
          {emailConfigured && <button type="button" className={ghostBtn} disabled={busy} onClick={test}>Send a test email to me</button>}
        </div>
      </form>
      {last && <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" role="status">{last}</p>}
    </section>
  );
}
