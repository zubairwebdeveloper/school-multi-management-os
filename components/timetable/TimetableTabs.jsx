import Link from "next/link";

export default function TimetableTabs({ slug, active }) {
  const b = `/${slug}/dashboard/timetables`;
  const tabs = [
    { id: "class", label: "Class timetable", href: b },
    { id: "teachers", label: "Teacher timetable", href: `${b}/teachers` },
    { id: "substitutions", label: "Substitutions", href: `${b}/substitutions` },
    { id: "setup", label: "Periods & publishing", href: `${b}/setup` },
  ];
  return (
    <nav aria-label="Timetables" className="flex flex-wrap gap-1 border-b border-slate-200 print:hidden dark:border-slate-800">
      {tabs.map((t) => (
        <Link key={t.id} href={t.href} aria-current={t.id === active ? "page" : undefined}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${t.id === active ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}>{t.label}</Link>
      ))}
    </nav>
  );
}
