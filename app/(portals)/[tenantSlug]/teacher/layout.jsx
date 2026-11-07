import { getTeacherContext } from "@/lib/tenant/getTeacherContext";
import TeacherShell from "@/components/teacher/TeacherShell";

export const dynamic = "force-dynamic";
export const metadata = { title: { default: "Teacher portal", template: "%s | Teacher portal" }, robots: { index: false, follow: false } };

export default async function TeacherLayout({ children, params }) {
  const { tenantSlug } = await params;
  const tc = await getTeacherContext(tenantSlug); // redirects / 404s unless the caller is an active, linked teacher
  return (
    <TeacherShell slug={tenantSlug} tenantName={tc.tenantName} teacherName={`${tc.employee.firstName} ${tc.employee.lastName}`}>
      {children}
    </TeacherShell>
  );
}
