import { PERMISSIONS as P } from "@/lib/permissions/permissions";

// Server-safe list (no icons). Sidebar maps `id` -> icon on the client (unknown ids get a default icon).
// Static folders under dashboard/ (e.g. students/) automatically override the
// "coming soon" page in dashboard/[section] once they are built.
export const DASHBOARD_SECTIONS = [
  { id: "overview", label: "Overview", href: "", group: "Main", permission: null },
  { id: "notifications", label: "Notifications", href: "notifications", group: "Main", permission: null },
  { id: "campuses", label: "Campuses", href: "campuses", group: "Organization", permission: P.CAMPUS_VIEW },
  { id: "academic-sessions", label: "Academic Sessions", href: "academic-sessions", group: "Academics", permission: P.CAMPUS_VIEW },
  { id: "classes", label: "Classes & Sections", href: "classes", group: "Academics", permission: P.CAMPUS_VIEW },
  { id: "subjects", label: "Subjects", href: "subjects", group: "Academics", permission: P.CAMPUS_VIEW },
  { id: "admissions", label: "Admissions", href: "admissions", group: "People", permission: P.ADMISSIONS_MANAGE },
  { id: "students", label: "Students", href: "students", group: "People", permission: P.STUDENTS_READ },
  { id: "teachers", label: "Teachers & Staff", href: "teachers", group: "People", permission: P.STAFF_READ },
  { id: "attendance", label: "Attendance", href: "attendance", group: "Operations", permission: P.ATTENDANCE_READ },
  { id: "timetables", label: "Timetables", href: "timetables", group: "Operations", permission: P.CAMPUS_VIEW },
  // Every role that can manage exams also holds RESULTS_APPROVE, and the Principal holds only the latter.
  { id: "examinations", label: "Examinations", href: "examinations", group: "Operations", permission: P.RESULTS_APPROVE },
  { id: "fees", label: "Fees", href: "fees", group: "Finance", permission: P.FEES_READ },
  { id: "finance", label: "Finance", href: "finance", group: "Finance", permission: P.FINANCE_READ },
  { id: "payroll", label: "Payroll", href: "payroll", group: "Finance", permission: P.PAYROLL_MANAGE },
  { id: "communications", label: "Communications", href: "communications", group: "Engage", permission: P.CAMPUS_MANAGE },
  { id: "analytics", label: "Analytics", href: "analytics", group: "Insights", permission: P.CAMPUS_VIEW },
  { id: "ai-center", label: "AI Center", href: "ai-center", group: "Insights", permission: P.AI_USE },
  { id: "audit-logs", label: "Audit Logs", href: "audit-logs", group: "Admin", permission: P.AUDIT_READ },
  { id: "settings", label: "Settings", href: "settings", group: "Admin", permission: P.SETTINGS_MANAGE },
];
