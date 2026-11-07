"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import LogoutButton from "@/components/auth/LogoutButton";

export default function ParentShell({ slug, tenantName, guardianName, children }) {
  const pathname = usePathname();
  const sp = useSearchParams();
  const child = sp.get("child");
  const base = `/${slug}/parent`;
  const links = [
    { href: `${base}/dashboard`, label: "Overview" },
    { href: `${base}/attendance`, label: "Attendance" },
    { href: `${base}/results`, label: "Results" },
    { href: `${base}/fees`, label: "Fees" },
    { href: `${base}/timetable`, label: "Timetable" },
    { href: `${base}/notifications`, label: "Notifications", noChild: true },
  ];
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white print:hidden dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#172554] text-sm font-bold text-[#D6B36A]" aria-hidden="true">{tenantName.slice(0, 1).toUpperCase()}</span>
            <span className="text-sm font-semibold">{tenantName}</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-slate-500 sm:inline">{guardianName}</span>
            <LogoutButton className="text-slate-500 hover:underline" />
          </div>
        </div>
        <nav aria-label="Parent portal" className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-4">
          {links.map((l) => {
            const active = pathname.startsWith(l.href);
            return (
              <Link key={l.href} href={child && !l.noChild ? `${l.href}?child=${encodeURIComponent(child)}` : l.href} aria-current={active ? "page" : undefined}
                className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${active ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}>{l.label}</Link>
            );
          })}
        </nav>
      </header>
      <main id="main" className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
