import Link from "next/link";

export default function FeesTabs({ slug, active, canManage, canFinance }) {
  const b = `/${slug}/dashboard/fees`;
  const tabs = [
    { id: "invoices", label: "Invoices", href: b },
    ...(canManage ? [
      { id: "generate", label: "Generate invoices", href: `${b}/generate` },
      { id: "structures", label: "Fee structures", href: `${b}/structures` },
      { id: "reminders", label: "Reminders", href: `${b}/reminders` },
    ] : []),
    ...(canFinance ? [{ id: "reports", label: "Reports", href: `${b}/reports` }] : []),
  ];
  return (
    <nav aria-label="Fees" className="flex flex-wrap gap-1 border-b border-slate-200 print:hidden dark:border-slate-800">
      {tabs.map((t) => (
        <Link key={t.id} href={t.href} aria-current={t.id === active ? "page" : undefined}
          className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${t.id === active ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}>{t.label}</Link>
      ))}
    </nav>
  );
}
