"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/auth/LogoutButton";

export default function TeacherShell({ slug, tenantName, teacherName, children }) {
  const pathname = usePathname();
  const base = `/${slug}/teacher`;
  const links = [
    { href: `${base}/dashboard`, label: "Today" },
    { href: `${base}/classes`, label: "My classes" },
    { href: `${base}/timetable`, label: "Timetable" },
    { href: `${base}/attendance`, label: "Attendance" },
    { href: `${base}/exams`, label: "Exams" },
    { href: `${base}/notifications`, label: "Notifications" },
  ];
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200 bg-white print:hidden dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#172554] text-sm font-bold text-[#D6B36A]" aria-hidden="true">{tenantName.slice(0, 1).toUpperCase()}</span>
            <span className="text-sm font-semibold">{tenantName}</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-slate-500 sm:inline">{teacherName}</span>
            <LogoutButton className="text-slate-500 hover:underline" />
          </div>
        </div>
        <nav aria-label="Teacher portal" className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4">
          {links.map((l) => {
            const active = pathname.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} aria-current={active ? "page" : undefined}
                className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${active ? "border-blue-600 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"}`}>{l.label}</Link>
            );
          })}
        </nav>
      </header>
      <main id="main" className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
