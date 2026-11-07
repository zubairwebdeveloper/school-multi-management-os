"use client";
export default function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()}
      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 print:hidden dark:border-slate-700 dark:hover:bg-slate-800">
      Print
    </button>
  );
}
