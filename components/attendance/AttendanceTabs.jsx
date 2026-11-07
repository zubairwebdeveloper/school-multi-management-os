import Link from "next/link";

export default function AttendanceTabs({ slug, active, canApprove }) {
  const tabs = [
    { id: "mark", label: "Mark attendance", href: `/${slug}/dashboard/attendance` },
    ...(canApprove ? [{ id: "corrections", label: "Corrections", href: `/${slug}/dashboard/attendance/corrections` }] : []),
    { id: "reports", label: "Monthly report", href: `/${slug}/dashboard/attendance/reports` },
  ];
  return (
    <nav aria-label="Attendance" className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
      {tabs.map((t) => (
        <Link key={t.id} href={t.href} aria-current={t.id === active ? "page" : undefined}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
            t.id === active ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}>{t.label}</Link>
      ))}
    </nav>
  );
}
