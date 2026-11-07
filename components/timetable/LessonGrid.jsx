"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DAYS } from "@/lib/utils/weekday";
import { inputCls, primaryBtn, ghostBtn } from "@/components/academics/shared";
import { clearLesson, setLesson, syncSectionTeachers } from "@/app/(workspace)/[tenantSlug]/dashboard/timetables/actions";

/** cells: { "<day>_<periodId>": { subjectId, subjectName, teacherName, room, stale } } */
export default function LessonGrid({ slug, sectionId, days, periods, cells, subjects, editable, staleCount }) {
  const router = useRouter();
  const [editing, setEditing] = useState(null); // { day, periodId, label }
  const [subjectId, setSubjectId] = useState("");
  const [room, setRoom] = useState("");
  const [busy, setBusy] = useState(false);
  const cols = DAYS.filter((d) => days.includes(d.value));

  function open(day, period) {
    const c = cells[`${day}_${period.id}`];
    setSubjectId(c?.subjectId || "");
    setRoom(c?.room || "");
    setEditing({ day, periodId: period.id, label: `${DAYS.find((d) => d.value === day).label}, ${period.name}`, has: !!c });
  }

  async function run(fn) {
    setBusy(true);
    try {
      const res = await fn();
      if (res.ok) { toast.success(res.message); setEditing(null); router.refresh(); } else toast.error(res.error);
    } catch { toast.error("Something went wrong. Please try again."); }
    finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      {editable && staleCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 print:hidden">
          <span>{staleCount} lesson(s) show a teacher who is no longer assigned to that subject.</span>
          <button className={ghostBtn} disabled={busy} onClick={() => run(() => syncSectionTeachers(slug, { sectionId }))}>Update teachers from assignments</button>
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white print:border-black dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
          <caption className="sr-only">Weekly class timetable</caption>
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50">
            <tr><th scope="col" className="px-3 py-2">Period</th>{cols.map((d) => <th key={d.value} scope="col" className="px-3">{d.label}</th>)}</tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 align-top dark:border-slate-800">
                <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-medium">{p.name}<div className="text-xs font-normal text-slate-500">{p.start}–{p.end}</div></th>
                {p.isBreak ? (
                  <td colSpan={cols.length} className="bg-slate-50 px-3 py-2 text-center text-xs uppercase tracking-wide text-slate-400 dark:bg-slate-800/40">Break</td>
                ) : cols.map((d) => {
                  const c = cells[`${d.value}_${p.id}`];
                  const inner = c ? (
                    <>
                      <div className="font-medium">{c.subjectName}</div>
                      <div className="text-xs text-slate-500">{c.teacherName}{c.room ? ` · ${c.room}` : ""}</div>
                      {c.stale && <div className="text-xs font-medium text-amber-600">Teacher changed</div>}
                    </>
                  ) : <span className="text-slate-300">{editable ? "+ Add" : "—"}</span>;
                  return (
                    <td key={d.value} className="p-0">
                      {editable ? (
                        <button type="button" onClick={() => open(d.value, p)} aria-label={`${d.label} ${p.name}: ${c ? c.subjectName : "empty, add lesson"}`}
                          className="block h-full w-full px-3 py-2 text-left hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 dark:hover:bg-slate-800">{inner}</button>
                      ) : <div className="px-3 py-2">{inner}</div>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Edit lesson">
          <div className="w-full max-w-sm space-y-4 rounded-xl bg-white p-5 dark:bg-slate-900">
            <h2 className="text-base font-semibold">{editing.label}</h2>
            {subjects.length === 0 ? (
              <p className="text-sm text-slate-500">No subjects have a teacher assigned for this section yet. Assign teachers first.</p>
            ) : (
              <>
                <div>
                  <label htmlFor="lg-subject" className="mb-1 block text-xs font-medium">Subject (teacher comes from the class assignment)</label>
                  <select id="lg-subject" autoFocus className={inputCls} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                    <option value="" disabled>Select…</option>
                    {subjects.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.teacherName}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="lg-room" className="mb-1 block text-xs font-medium">Room (optional)</label>
                  <input id="lg-room" className={inputCls} value={room} maxLength={40} onChange={(e) => setRoom(e.target.value)} />
                </div>
              </>
            )}
            <div className="flex flex-wrap gap-2">
              {subjects.length > 0 && (
                <button className={primaryBtn} disabled={busy || !subjectId}
                  onClick={() => run(() => setLesson(slug, { sectionId, day: editing.day, periodId: editing.periodId, subjectId, room }))}>{busy ? "Saving…" : "Save"}</button>
              )}
              {editing.has && <button className={ghostBtn} disabled={busy} onClick={() => run(() => clearLesson(slug, { sectionId, day: editing.day, periodId: editing.periodId }))}>Remove lesson</button>}
              <button className={ghostBtn} onClick={() => setEditing(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
