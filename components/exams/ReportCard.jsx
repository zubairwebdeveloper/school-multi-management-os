import { tenthsText } from "@/lib/exams/format";

/** Presentational, printable report card. Receives plain data only. */
export default function ReportCard({ schoolName, campusName, exam, examTypeLabel, r }) {
  return (
    <article className="rounded-xl border border-slate-300 bg-white p-6 text-slate-900 print:border-black print:p-4" aria-label={`Report card for ${r.studentName}`}>
      <header className="border-b border-slate-200 pb-3 text-center">
        <h1 className="text-xl font-bold">{schoolName}</h1>
        {campusName && <p className="text-xs text-slate-500">{campusName}</p>}
        <h2 className="mt-2 text-base font-semibold">{exam.name} — Report card</h2>
        <p className="text-xs text-slate-500">{examTypeLabel}</p>
      </header>

      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
        <div className="flex justify-between"><dt className="text-slate-500">Student</dt><dd className="font-medium">{r.studentName}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">Admission no.</dt><dd className="font-mono text-xs">{r.admissionNumber}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">Class</dt><dd className="font-medium">{exam.className}{r.sectionName ? ` – ${r.sectionName}` : ""}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">Issued</dt><dd>{exam.publishedOn}</dd></div>
      </dl>

      <table className="mt-4 w-full border-collapse text-left text-sm">
        <caption className="sr-only">Subject-wise marks</caption>
        <thead className="bg-slate-50 text-xs uppercase text-slate-500 print:bg-transparent">
          <tr><th scope="col" className="border-b px-2 py-1.5">Subject</th><th scope="col" className="border-b px-2 text-right">Total</th><th scope="col" className="border-b px-2 text-right">Obtained</th><th scope="col" className="border-b px-2 text-right">%</th><th scope="col" className="border-b px-2">Grade</th><th scope="col" className="border-b px-2">Result</th></tr>
        </thead>
        <tbody>
          {r.subjects.map((s) => (
            <tr key={s.subjectId} className="border-b border-slate-100">
              <th scope="row" className="px-2 py-1.5 text-left font-medium">{s.name}</th>
              <td className="px-2 text-right">{s.total}</td>
              <td className="px-2 text-right">{s.absent ? "Absent" : tenthsText(s.obtained10)}</td>
              <td className="px-2 text-right">{s.absent ? "—" : s.percent.toFixed(2)}</td>
              <td className="px-2">{s.grade}</td>
              <td className={`px-2 ${s.passed ? "text-emerald-700" : "font-medium text-red-600"}`}>{s.passed ? "Pass" : "Fail"}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="font-semibold"><th scope="row" className="px-2 py-2 text-left">Total</th><td className="px-2 text-right">{r.totalMax}</td><td className="px-2 text-right">{tenthsText(r.totalObtained10)}</td><td className="px-2 text-right">{r.percent.toFixed(2)}</td><td className="px-2">{r.grade}</td><td className={`px-2 ${r.result === "PASS" ? "text-emerald-700" : "text-red-600"}`}>{r.result === "PASS" ? "PASS" : "FAIL"}</td></tr>
        </tfoot>
      </table>

      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
        <div className="flex justify-between"><dt className="text-slate-500">Class position</dt><dd className="font-medium">{r.classPosition} of {r.classSize}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">Section position</dt><dd className="font-medium">{r.sectionPosition}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">Pass mark</dt><dd className="font-medium">{exam.passPercent}% per subject</dd></div>
      </dl>
      <p className="mt-4 text-xs text-slate-500">Grading scale: {exam.bands.map((b) => `${b.grade} ≥ ${b.min}%`).join(" · ")}. A student passes when every subject is passed. Computer-generated report card.</p>
    </article>
  );
}
