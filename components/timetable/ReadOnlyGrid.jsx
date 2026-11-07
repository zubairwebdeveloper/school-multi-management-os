import { DAYS } from "@/lib/utils/weekday";

/** cell(day, periodId) -> { lines: string[] } | null */
export default function ReadOnlyGrid({ days, periods, cell, caption }) {
  const cols = DAYS.filter((d) => days.includes(d.value));
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white print:border-black dark:border-slate-800 dark:bg-slate-900">
      <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
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
                const c = cell(d.value, p.id);
                return (
                  <td key={d.value} className="px-3 py-2">
                    {c ? c.lines.map((l, i) => <div key={i} className={i === 0 ? "font-medium" : "text-xs text-slate-500"}>{l}</div>) : <span className="text-slate-300">—</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
