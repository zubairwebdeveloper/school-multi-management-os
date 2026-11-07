"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { card, ghostBtn, primaryBtn } from "@/components/academics/shared";

/** students: [{id,name,adm,obtained:string,absent:boolean}]. saveAction(slug, {examId,sectionId,subjectId,submit,entries}) */
export default function MarksSheet({ slug, examId, sectionId, subjectId, total, students, editable, saveAction }) {
  const router = useRouter();
  const [rows, setRows] = useState(() => Object.fromEntries(students.map((s) => [s.id, { obtained: s.obtained, absent: s.absent }])));
  const [busy, setBusy] = useState(false);
  const patch = (id, p) => setRows((r) => ({ ...r, [id]: { ...r[id], ...p } }));

  const bad = (v) => v !== "" && (!/^\d{1,4}(\.\d)?$/.test(v) || Number(v) > total);
  const missing = useMemo(() => students.filter((s) => !rows[s.id].absent && rows[s.id].obtained.trim() === "").length, [students, rows]);
  const invalid = useMemo(() => students.some((s) => !rows[s.id].absent && bad(rows[s.id].obtained.trim())), [students, rows]);

  async function save(submit) {
    if (submit && !window.confirm("Submit these marks for verification? You cannot edit them after submitting.")) return;
    setBusy(true);
    try {
      const res = await saveAction(slug, {
        examId, sectionId, subjectId, submit,
        entries: students.map((s) => ({ studentId: s.id, obtained: rows[s.id].absent ? "" : rows[s.id].obtained, absent: rows[s.id].absent })),
      });
      if (res.ok) { toast.success(res.message); router.refresh(); } else toast.error(res.error);
    } catch { toast.error("Something went wrong. Please try again."); }
    finally { setBusy(false); }
  }

  if (!students.length) return <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700">No active students in this section.</div>;

  return (
    <section className={card} aria-label="Marks sheet">
      <p className="mb-3 text-sm text-slate-500" aria-live="polite">Total marks: <strong>{total}</strong>{editable && missing > 0 ? ` · ${missing} without marks` : ""}</p>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {students.map((s) => {
          const r = rows[s.id];
          const err = !r.absent && bad(r.obtained.trim());
          return (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <div className="min-w-[10rem]"><p className="text-sm font-medium">{s.name}</p><p className="font-mono text-xs text-slate-500">{s.adm}</p></div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-sm"><input type="checkbox" disabled={!editable} checked={r.absent} onChange={(e) => patch(s.id, { absent: e.target.checked })} />Absent</label>
                <div>
                  <label htmlFor={`mk-${s.id}`} className="sr-only">Marks for {s.name}</label>
                  <input id={`mk-${s.id}`} inputMode="decimal" disabled={!editable || r.absent} value={r.absent ? "" : r.obtained} aria-invalid={err}
                    onChange={(e) => patch(s.id, { obtained: e.target.value })} placeholder={`/ ${total}`}
                    className={`h-10 w-24 rounded-lg border bg-white px-2 text-sm dark:bg-slate-900 ${err ? "border-red-500" : "border-slate-300 dark:border-slate-700"}`} />
                  {err && <p className="mt-0.5 text-xs text-red-600">0 to {total}</p>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {editable && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" className={ghostBtn} disabled={busy || invalid} onClick={() => save(false)}>Save draft</button>
          <button type="button" className={primaryBtn} disabled={busy || invalid || missing > 0} onClick={() => save(true)}>Save &amp; submit for verification</button>
        </div>
      )}
    </section>
  );
}
