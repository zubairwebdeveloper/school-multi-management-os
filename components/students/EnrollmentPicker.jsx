"use client";
import { inputCls } from "@/components/academics/shared";

/**
 * Dependent selects: [campus] -> class -> section.
 * classes: [{id,campusId,name}], sections: [{id,classId,name,capacity}]
 * The server re-validates every id; this only guides the user.
 */
export default function EnrollmentPicker({ campuses, classes, sections, value, onChange, errors = {} }) {
  const set = (patch) => onChange({ ...value, ...patch });
  const campusClasses = classes.filter((c) => !value.campusId || c.campusId === value.campusId);
  const classSections = sections.filter((s) => s.classId === value.classId);
  const Err = ({ k }) => (errors[k] ? <p className="mt-1 text-xs text-red-600">{errors[k][0]}</p> : null);
  const lbl = "mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300";

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {campuses && (
        <div>
          <label htmlFor="ep-campus" className={lbl}>Campus</label>
          <select id="ep-campus" className={inputCls} value={value.campusId || ""}
            onChange={(e) => set({ campusId: e.target.value, classId: "", sectionId: "" })}>
            <option value="" disabled>Select…</option>
            {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Err k="campusId" />
        </div>
      )}
      <div>
        <label htmlFor="ep-class" className={lbl}>Class</label>
        <select id="ep-class" className={inputCls} value={value.classId || ""}
          onChange={(e) => set({ classId: e.target.value, sectionId: "" })} disabled={campuses && !value.campusId}>
          <option value="" disabled>Select…</option>
          {campusClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Err k="classId" />
      </div>
      <div>
        <label htmlFor="ep-section" className={lbl}>Section</label>
        <select id="ep-section" className={inputCls} value={value.sectionId || ""}
          onChange={(e) => set({ sectionId: e.target.value })} disabled={!value.classId}>
          <option value="" disabled>Select…</option>
          {classSections.map((s) => <option key={s.id} value={s.id}>{s.name} (capacity {s.capacity})</option>)}
        </select>
        <Err k="sectionId" />
      </div>
    </div>
  );
}
