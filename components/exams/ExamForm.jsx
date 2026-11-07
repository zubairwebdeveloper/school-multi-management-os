"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { card, ghostBtn, inputCls, primaryBtn } from "@/components/academics/shared";
import { EXAM_TYPES } from "@/lib/validations/exams";
import { createExam, updateExam } from "@/app/(workspace)/[tenantSlug]/dashboard/examinations/actions";

const lbl = "mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300";

export default function ExamForm({ slug, classes, subjects, gradings, exam }) {
  const router = useRouter();
  const editing = !!exam;
  const [classId, setClassId] = useState(exam?.classId || "");
  const [gradingSystemId, setGrading] = useState(exam?.gradingSystemId || "");
  const [name, setName] = useState(exam?.name || "");
  const [type, setType] = useState(exam?.type || "");
  const [passPercent, setPass] = useState(exam?.passPercent ?? 40);
  const [lines, setLines] = useState(exam?.subjects?.map((s) => ({ subjectId: s.subjectId, total: s.total })) || [{ subjectId: "", total: "" }]);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});

  const curriculum = classes.find((c) => c.id === classId)?.curriculum;
  const options = useMemo(() => subjects.filter((s) => s.curriculum === "ALL" || s.curriculum === curriculum), [subjects, curriculum]);
  const patch = (i, p) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...p } : l)));

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErrors({});
    try {
      const res = editing
        ? await updateExam(slug, exam.id, { name, type, passPercent, subjects: lines })
        : await createExam(slug, { classId, gradingSystemId, name, type, passPercent, subjects: lines });
      if (res.ok) {
        toast.success(res.message);
        if (!editing) router.push(`/${slug}/dashboard/examinations/${res.id}`);
        router.refresh();
      } else { setErrors(res.fieldErrors || {}); toast.error(res.error); }
    } catch { toast.error("Something went wrong. Please try again."); }
    finally { setBusy(false); }
  }
  const Err = ({ k }) => (errors[k] ? <p className="mt-1 text-xs text-red-600">{errors[k][0]}</p> : null);

  return (
    <form onSubmit={submit} className={`${card} space-y-4`} noValidate>
      <div className="grid gap-3 sm:grid-cols-2">
        {!editing && (
          <div>
            <label htmlFor="ex-class" className={lbl}>Class</label>
            <select id="ex-class" className={inputCls} value={classId} onChange={(e) => { setClassId(e.target.value); setLines([{ subjectId: "", total: "" }]); }}>
              <option value="" disabled>Select…</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select><Err k="classId" />
          </div>
        )}
        <div><label htmlFor="ex-name" className={lbl}>Exam name</label><input id="ex-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Midterm 2026" /><Err k="name" /></div>
        <div><label htmlFor="ex-type" className={lbl}>Type</label>
          <select id="ex-type" className={inputCls} value={type} onChange={(e) => setType(e.target.value)}><option value="" disabled>Select…</option>{EXAM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select><Err k="type" /></div>
        {!editing && (
          <div><label htmlFor="ex-grade" className={lbl}>Grading scale (copied into the exam)</label>
            <select id="ex-grade" className={inputCls} value={gradingSystemId} onChange={(e) => setGrading(e.target.value)}><option value="" disabled>Select…</option>{gradings.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}</select><Err k="gradingSystemId" /></div>
        )}
        <div><label htmlFor="ex-pass" className={lbl}>Pass percentage</label><input id="ex-pass" inputMode="numeric" className={inputCls} value={passPercent} onChange={(e) => setPass(e.target.value)} /><Err k="passPercent" /></div>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Subjects and total marks</legend>
        {!classId && !editing ? <p className="text-sm text-slate-500">Choose a class first.</p> : (
          <ul className="space-y-2">
            {lines.map((l, i) => (
              <li key={i} className="grid items-end gap-2 sm:grid-cols-[1fr_9rem_auto]">
                <div><label htmlFor={`el-s-${i}`} className={lbl}>Subject</label>
                  <select id={`el-s-${i}`} className={inputCls} value={l.subjectId} onChange={(e) => patch(i, { subjectId: e.target.value })}>
                    <option value="" disabled>Select…</option>{(editing ? subjects.filter((s) => s.curriculum === "ALL" || s.curriculum === exam.curriculum) : options).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select><Err k={`subjects.${i}.subjectId`} /></div>
                <div><label htmlFor={`el-t-${i}`} className={lbl}>Total marks</label><input id={`el-t-${i}`} inputMode="numeric" className={inputCls} value={l.total} onChange={(e) => patch(i, { total: e.target.value })} /><Err k={`subjects.${i}.total`} /></div>
                <button type="button" className={ghostBtn} disabled={lines.length === 1} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>Remove</button>
              </li>
            ))}
          </ul>
        )}
        <button type="button" className={`${ghostBtn} mt-3`} disabled={lines.length >= 20 || (!classId && !editing)} onClick={() => setLines((ls) => [...ls, { subjectId: "", total: "" }])}>Add subject</button>
        <Err k="subjects" />
      </fieldset>

      <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Saving…" : editing ? "Save changes" : "Create exam"}</button>
    </form>
  );
}
