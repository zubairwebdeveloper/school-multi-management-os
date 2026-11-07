import { adminDb } from "@/lib/firebase/admin";
import { getPlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import ApplicationActions from "@/components/platform/ApplicationActions";

export const metadata = { title: "Applications" };

const iso = (ts) => (ts?.toDate ? ts.toDate().toISOString().slice(0, 10) : "");

export default async function ApplicationsPage() {
  const admin = await getPlatformAdmin(); // layout already guards; needed for role-based UI
  const snap = await adminDb.collection("tenantApplications").orderBy("createdAt", "desc").limit(100).get();
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const open = rows.filter((r) => ["PENDING", "UNDER_REVIEW"].includes(r.status));
  const decided = rows.filter((r) => ["APPROVED", "REJECTED"].includes(r.status));
  const canDecide = admin?.role === "SUPER_ADMIN";

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-bold tracking-tight">Awaiting review ({open.length})</h1>
        {open.length === 0 && <p className="mt-3 text-sm text-slate-500">No applications are waiting.</p>}
        <ul className="mt-4 space-y-4">
          {open.map((a) => (
            <li key={a.id} className="rounded-xl border border-slate-200 p-5 dark:border-slate-800">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1 text-sm">
                  <p className="text-base font-semibold">{a.organization?.name}</p>
                  <p className="text-slate-500">{a.organization?.institutionType?.replaceAll("_", " ")} · {a.organization?.city}, {a.organization?.country}</p>
                  <p>Applicant: {a.applicantEmail}</p>
                  <p>Contact: {a.organization?.contactEmail} · {a.organization?.contactPhone}</p>
                  <p>Expected students: {a.organization?.expectedStudents} · Curricula: {a.organization?.curricula?.join(", ")}</p>
                  <p>First campus: {a.initialCampus?.name} ({a.initialCampus?.city})</p>
                  <p className="text-xs text-slate-400">Submitted {iso(a.createdAt)}</p>
                </div>
                {canDecide ? (
                  <ApplicationActions applicationId={a.id} organizationName={a.organization?.name} />
                ) : (
                  <p className="text-xs text-slate-500">Read-only access</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Recent decisions</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-slate-500">
              <tr><th className="py-2 pr-4">Organization</th><th className="pr-4">Applicant</th><th className="pr-4">Status</th><th>Workspace</th></tr>
            </thead>
            <tbody>
              {decided.map((a) => (
                <tr key={a.id} className="border-t border-slate-200 dark:border-slate-800">
                  <td className="py-2 pr-4">{a.organization?.name}</td>
                  <td className="pr-4">{a.applicantEmail}</td>
                  <td className="pr-4">{a.status}</td>
                  <td>{a.tenantSlug || "—"}</td>
                </tr>
              ))}
              {decided.length === 0 && <tr><td colSpan={4} className="py-3 text-slate-500">Nothing yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
