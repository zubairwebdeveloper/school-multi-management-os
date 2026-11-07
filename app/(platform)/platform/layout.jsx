import { notFound } from "next/navigation";
import Link from "next/link";
import { getPlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import LogoutButton from "@/components/auth/LogoutButton";

export const metadata = { title: { default: "Platform admin", template: "%s | Platform admin" }, robots: { index: false } };

export default async function PlatformLayout({ children }) {
  const admin = await getPlatformAdmin();
  if (!admin) notFound(); // do not reveal that the area exists

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-3 dark:border-slate-800">
        <nav className="flex items-center gap-6 text-sm">
          <span className="font-semibold">Platform admin</span>
          <Link href="/platform/applications" className="text-slate-600 hover:text-slate-900 dark:text-slate-400">Applications</Link>
        </nav>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-slate-500">{admin.email} · {admin.role}</span>
          <LogoutButton className="text-slate-500 hover:underline" />
        </div>
      </header>
      <div className="mx-auto max-w-5xl px-6 py-8">{children}</div>
    </div>
  );
}
