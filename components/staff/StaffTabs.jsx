import Link from "next/link";

export default function StaffTabs({ slug, active }) {
  const base = `/${slug}/dashboard/teachers`;
  const tabs = [
    { id: "staff", label: "Staff", href: base },
    { id: "assignments", label: "Class assignments", href: `${base}/assignments` },
    { id: "departments", label: "Departments", href: `${base}/departments` },
  ];
  return (
    <nav aria-label="Staff" className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
      {tabs.map((t) => (
        <Link key={t.id} href={t.href} aria-current={t.id === active ? "page" : undefined}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${t.id === active ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
