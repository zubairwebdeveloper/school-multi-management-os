import Link from "next/link";

export default function ExamsTabs({ slug, active, canManage }) {
  const b = `/${slug}/dashboard/examinations`;
  const tabs = [
    { id: "exams", label: "Exams", href: b },
    ...(canManage ? [{ id: "grading", label: "Grading scales", href: `${b}/grading` }] : []),
  ];
  return (
    <nav aria-label="Examinations" className="flex gap-1 border-b border-slate-200 dark:border-slate-800">
      {tabs.map((t) => (
        <Link key={t.id} href={t.href} aria-current={t.id === active ? "page" : undefined}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${t.id === active ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}>{t.label}</Link>
      ))}
    </nav>
  );
}
