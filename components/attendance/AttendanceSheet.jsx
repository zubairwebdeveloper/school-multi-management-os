"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ATTENDANCE_STATUSES } from "@/lib/validations/attendance";
import { card, primaryBtn, ghostBtn } from "@/components/academics/shared";
import { saveSectionAttendance } from "@/app/(workspace)/[tenantSlug]/dashboard/attendance/actions";

const tone = {
  PRESENT: "bg-emerald-600 text-white border-emerald-600",
  ABSENT: "bg-red-600 text-white border-red-600",
  LATE: "bg-amber-500 text-white border-amber-500",
  LEAVE: "bg-sky-600 text-white border-sky-600",
  HALF_DAY: "bg-violet-600 text-white border-violet-600",
};

// `saveAction` lets other surfaces (e.g. the teacher portal) plug in their own Server Action
// with its own authorization. The dashboard action is the default.
export default function AttendanceSheet({ slug, sectionId, date, students, editable, saveAction }) {
  const router = useRouter();
  const [marks, setMarks] = useState(() => Object.fromEntries(students.map((s) => [s.id, s.status || null])));
  const [remarks, setRemarks] = useState(() => Object.fromEntries(students.map((s) => [s.id, s.remark || ""])));
  const [busy, setBusy] = useState(false);

  const unmarked = useMemo(() => students.filter((s) => !marks[s.id]).length, [students, marks]);
  const tally = useMemo(() => {
    const t = Object.fromEntries(ATTENDANCE_STATUSES.map((s) => [s.value, 0]));
    Object.values(marks).forEach((m) => m && (t[m] += 1));
    return t;
  }, [marks]);

  async function save() {
    setBusy(true);
    try {
      const run = saveAction || saveSectionAttendance;
      const res = await run(slug, {
        sectionId, date,
        entries: students.map((s) => ({ studentId: s.id, status: marks[s.id], remark: remarks[s.id] })),
      });
      if (res.ok) { toast.success(res.message); router.refresh(); } else toast.error(res.error);
    } catch { toast.error("Something went wrong. Please try again."); }
    finally { setBusy(false); }
  }

  if (students.length === 0) {
    return <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700">No active students in this section.</div>;
  }

  return (
    <section className={card} aria-label="Attendance sheet">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600 dark:text-slate-300" aria-live="polite">
          {ATTENDANCE_STATUSES.map((s) => `${s.short}: ${tally[s.value]}`).join("  ·  ")}
          {unmarked > 0 && <span className="ml-3 font-medium text-amber-600">{unmarked} unmarked</span>}
        </p>
        {editable && <button type="button" className={ghostBtn} onClick={() => setMarks(Object.fromEntries(students.map((s) => [s.id, "PRESENT"])))}>Mark all present</button>}
      </div>

      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {students.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="min-w-[10rem]">
              <p className="text-sm font-medium">{s.name}</p>
              <p className="font-mono text-xs text-slate-500">{s.admissionNumber}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div role="group" aria-label={`Attendance for ${s.name}`} className="flex gap-1">
                {ATTENDANCE_STATUSES.map((st) => {
                  const on = marks[s.id] === st.value;
                  return (
                    <button key={st.value} type="button" disabled={!editable} aria-pressed={on} title={st.label}
                      onClick={() => setMarks((m) => ({ ...m, [s.id]: st.value }))}
                      className={`h-10 min-w-[2.5rem] rounded-lg border px-2 text-sm font-semibold transition disabled:cursor-default ${
                        on ? tone[st.value] : "border-slate-300 text-slate-600 hover:bg-slate-50 disabled:hover:bg-transparent dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"}`}>
                      {st.short}
                    </button>
                  );
                })}
              </div>
              {editable && (
                <input aria-label={`Remark for ${s.name}`} placeholder="Remark" maxLength={200} value={remarks[s.id]}
                  onChange={(e) => setRemarks((r) => ({ ...r, [s.id]: e.target.value }))}
                  className="w-40 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
              )}
              {!editable && remarks[s.id] && <span className="text-xs text-slate-500">{remarks[s.id]}</span>}
            </div>
          </li>
        ))}
      </ul>

      {editable && (
        <div className="mt-4 flex items-center gap-3">
          <button type="button" onClick={save} disabled={busy || unmarked > 0} className={primaryBtn}>{busy ? "Saving…" : "Save attendance"}</button>
          {unmarked > 0 && <span className="text-xs text-slate-500">Mark every student to save.</span>}
        </div>
      )}
    </section>
  );
}
