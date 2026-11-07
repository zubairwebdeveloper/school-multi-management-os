"use client";
import { useRouter } from "next/navigation";
import { inputCls } from "@/components/academics/shared";

// Navigates with query params; the server page validates both values again.
export default function SectionPicker({ basePath, sections, sectionId, date, minDate, maxDate, month }) {
  const router = useRouter();
  const go = (patch) => {
    const u = new URLSearchParams({ section: sectionId || "", ...(month ? { month } : { date }), ...patch });
    router.push(`${basePath}?${u.toString()}`);
  };
  const lbl = "mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300";
  return (
    <div className="flex flex-wrap items-end gap-4">
      <div>
        <label htmlFor="sp-section" className={lbl}>Class &amp; section</label>
        <select id="sp-section" className={`${inputCls} min-w-[14rem]`} value={sectionId || ""} onChange={(e) => go({ section: e.target.value })}>
          {sections.length === 0 && <option value="">No sections</option>}
          {sections.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      </div>
      {month !== undefined ? (
        <div>
          <label htmlFor="sp-month" className={lbl}>Month</label>
          <input id="sp-month" type="month" className={inputCls} value={month} max={maxDate} onChange={(e) => e.target.value && go({ month: e.target.value })} />
        </div>
      ) : (
        <div>
          <label htmlFor="sp-date" className={lbl}>Date</label>
          <input id="sp-date" type="date" className={inputCls} value={date} min={minDate} max={maxDate} onChange={(e) => e.target.value && go({ date: e.target.value })} />
        </div>
      )}
    </div>
  );
}
