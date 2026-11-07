"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { card, inputCls } from "@/components/academics/shared";
import { assignTeacher, removeAssignment, setClassTeacher } from "@/app/(workspace)/[tenantSlug]/dashboard/teachers/actions";

export function SectionSelect({ basePath, sections, sectionId }) {
  const router = useRouter();
  return (
    <div>
      <label htmlFor="as-section" className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Class &amp; section</label>
      <select id="as-section" className={`${inputCls} min-w-[14rem]`} value={sectionId || ""}
        onChange={(e) => router.push(`${basePath}?section=${encodeURIComponent(e.target.value)}`)}>
        {sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
      </select>
    </div>
  );
}

function TeacherSelect({ id, label, value, teachers, disabled, onPick }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <select id={id} className={`${inputCls} max-w-xs`} value={value || ""} disabled={disabled || busy}
        onChange={async (e) => { setBusy(true); try { await onPick(e.target.value); } finally { setBusy(false); } }}>
        <option value="">— Not assigned —</option>
        {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
    </div>
  );
}

export default function AssignmentsManager({ slug, sectionId, subjects, teachers, assignments, classTeacherId, canManage }) {
  const router = useRouter();
  const done = (res) => { if (res.ok) { toast.success(res.message); router.refresh(); } else toast.error(res.error); };
  const guard = async (fn) => { try { done(await fn()); } catch { toast.error("Something went wrong. Please try again."); } };

  return (
    <div className="space-y-6">
      {teachers.length === 0 && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">No active teaching staff in this campus yet. Add teachers first.</p>}

      <section className={card}>
        <h2 className="text-base font-semibold">Class teacher</h2>
        <TeacherSelect id="ct" label="Class teacher" value={classTeacherId} teachers={teachers} disabled={!canManage}
          onPick={(v) => guard(() => setClassTeacher(slug, { sectionId, employeeId: v }))} />
      </section>

      <section className={card}>
        <h2 className="text-base font-semibold">Subject teachers</h2>
        {subjects.length === 0 ? <p className="mt-2 text-sm text-slate-500">No subjects match this class's curriculum.</p> : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {subjects.map((s) => (
              <TeacherSelect key={s.id} id={`subj-${s.id}`} label={`${s.name}${s.code ? ` (${s.code})` : ""}`} value={assignments[s.id]} teachers={teachers} disabled={!canManage}
                onPick={(v) => guard(() => (v ? assignTeacher(slug, { sectionId, subjectId: s.id, employeeId: v }) : removeAssignment(slug, { sectionId, subjectId: s.id })))} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
