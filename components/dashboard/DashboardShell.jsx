"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3, BookOpen, Building2, CalendarClock, CalendarDays, ClipboardCheck, GraduationCap,
  LayoutDashboard, Library, Menu, MessageSquare, ScrollText, Settings, Sparkles, UserPlus,
  Users, Wallet, Landmark, BadgeDollarSign, X,
} from "lucide-react";
import { DASHBOARD_SECTIONS } from "@/lib/navigation/sections";
import CampusSwitcher from "./CampusSwitcher";
import LogoutButton from "@/components/auth/LogoutButton";

const ICONS = {
  overview: LayoutDashboard, campuses: Building2, "academic-sessions": CalendarDays, classes: Library,
  subjects: BookOpen, admissions: UserPlus, students: GraduationCap, teachers: Users,
  attendance: ClipboardCheck, timetables: CalendarClock, examinations: ScrollText, fees: Wallet,
  finance: Landmark, payroll: BadgeDollarSign, communications: MessageSquare, analytics: BarChart3,
  "ai-center": Sparkles, "audit-logs": ScrollText, settings: Settings,
};

function Nav({ slug, permissions, onNavigate }) {
  const pathname = usePathname();
  const base = `/${slug}/dashboard`;
  // Hiding links is only UX. Each page enforces permissions on the server.
  const items = DASHBOARD_SECTIONS.filter((s) => !s.permission || permissions.includes(s.permission));
  const groups = [...new Set(items.map((i) => i.group))];

  return (
    <nav aria-label="Dashboard" className="space-y-6">
      {groups.map((g) => (
        <div key={g}>
          <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{g}</p>
          <ul className="space-y-0.5">
            {items.filter((i) => i.group === g).map((i) => {
              const href = i.href ? `${base}/${i.href}` : base;
              const active = i.href ? pathname.startsWith(href) : pathname === base;
              const Icon = ICONS[i.id] || LayoutDashboard;
              return (
                <li key={i.id}>
                  <Link href={href} onClick={onNavigate} aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 ${
                      active
                        ? "bg-blue-500/10 font-semibold text-blue-600 dark:text-blue-400"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}>
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {i.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export default function DashboardShell({ slug, tenantName, userEmail, role, permissions, campuses, selectedCampusId, orgWide, children }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);

  const brand = (
    <div className="flex items-center gap-2 px-3">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#172554] text-sm font-bold text-[#D6B36A]" aria-hidden="true">
        {tenantName.slice(0, 1).toUpperCase()}
      </span>
      <span className="truncate text-sm font-semibold">{tenantName}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 overflow-y-auto border-r border-slate-200 bg-white py-5 dark:border-slate-800 dark:bg-slate-900 lg:block">
        <div className="mb-6">{brand}</div>
        <div className="px-2"><Nav slug={slug} permissions={permissions} /></div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button className="absolute inset-0 bg-black/40" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 overflow-y-auto bg-white py-5 dark:bg-slate-900">
            <div className="mb-6 flex items-center justify-between pr-3">
              {brand}
              <button onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-2"><Nav slug={slug} permissions={permissions} onNavigate={() => setOpen(false)} /></div>
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
          <button onClick={() => setOpen(true)} aria-label="Open menu" className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <CampusSwitcher slug={slug} campuses={campuses} selected={selectedCampusId} allowAll={orgWide} />
          <div className="ml-auto flex items-center gap-4 text-sm">
            <span className="hidden text-slate-500 sm:inline">{userEmail} · {role.replaceAll("_", " ")}</span>
            <LogoutButton className="text-slate-500 hover:underline" />
          </div>
        </header>
        <main id="main" className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
