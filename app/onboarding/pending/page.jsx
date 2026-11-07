import Link from "next/link";
import { redirect } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import LogoutButton from "@/components/auth/LogoutButton";

export const metadata = { title: "Application status" };

const COPY = {
  PENDING: { title: "Application received", body: "Your application is waiting for review. We will update this page once a decision is made." },
  UNDER_REVIEW: { title: "Application under review", body: "Our team is reviewing your application." },
  APPROVED: { title: "Application approved", body: "Your organization has been approved and your workspace is ready." },
  REJECTED: { title: "Application not approved", body: "Unfortunately we could not approve this application." },
};

export default async function PendingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/onboarding/pending");

  const snap = await adminDb
    .collection("tenantApplications")
    .where("applicantUid", "==", user.uid)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();
  if (snap.empty) redirect("/onboarding");

  const app = snap.docs[0].data();
  const copy = COPY[app.status] || COPY.PENDING;

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-4 py-12">
      <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">{app.status.replace("_", " ")}</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight">{copy.title}</h1>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{copy.body}</p>

      <dl className="mt-6 space-y-1 rounded-xl border border-slate-200 p-4 text-sm dark:border-slate-800">
        <div className="flex justify-between"><dt className="text-slate-500">Organization</dt><dd className="font-medium">{app.organization?.name}</dd></div>
        <div className="flex justify-between"><dt className="text-slate-500">First campus</dt><dd className="font-medium">{app.initialCampus?.name}</dd></div>
      </dl>

      {app.status === "APPROVED" && app.tenantSlug && (
        <Link href={`/${app.tenantSlug}/dashboard`}
          className="mt-6 rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-blue-700">
          Open your workspace
        </Link>
      )}

      {app.status === "REJECTED" && app.rejectionReason && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          Reason: {app.rejectionReason}
        </p>
      )}

      <div className="mt-8 flex items-center gap-4 text-sm">
        {app.status === "REJECTED" && (
          <Link href="/onboarding" className="font-medium text-blue-600 hover:underline">Submit a new application</Link>
        )}
        <LogoutButton className="text-slate-500 hover:underline" />
      </div>
    </main>
  );
}
