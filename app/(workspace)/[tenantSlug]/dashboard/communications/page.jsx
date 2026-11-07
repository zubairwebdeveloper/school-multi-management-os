import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { loadAttendanceSections } from "@/lib/tenant/attendanceSections";
import { PERMISSIONS as P } from "@/lib/permissions";
import { emailConfig } from "@/lib/communications/email";
import { getAlertSettings } from "@/lib/communications/notifyGuardians";
import { card } from "@/components/academics/shared";
import AnnouncementForm from "@/components/communications/AnnouncementForm";
import AlertSettings from "@/components/communications/AlertSettings";

export const metadata = { title: "Communications" };
export const dynamic = "force-dynamic";

const EMAIL_TEXT = {
  NOT_REQUESTED: "Email not requested", NOT_CONFIGURED: "Email NOT sent (no provider configured)", SENT: "Emailed", PARTIAL: "Emailed (some failed)", FAILED: "Email failed",
};

export default async function CommunicationsPage({ params }) {
  const { tenantSlug } = await params;
  const ctx = await getTenantContext(tenantSlug);
  if (!ctx.permissions.includes(P.CAMPUS_MANAGE)) notFound();

  const base = adminDb.doc(`tenants/${ctx.tenantId}`);
  const [{ sections }, clsSnap, annSnap, alerts] = await Promise.all([
    loadAttendanceSections({ ...ctx, selectedCampusId: "ALL" }),
    base.collection("classes").where("status", "==", "ACTIVE").get(),
    base.collection("announcements").orderBy("createdAt", "desc").limit(60).get(),
    getAlertSettings(ctx.tenantId),
  ]);
  const allowed = new Set(ctx.campuses.map((c) => c.id));
  const campusName = Object.fromEntries(ctx.campuses.map((c) => [c.id, c.name]));
  const multi = ctx.campuses.length > 1;
  const classes = clsSnap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((c) => allowed.has(c.campusId))
    .sort((a, b) => a.campusId.localeCompare(b.campusId) || a.level - b.level)
    .map((c) => ({ id: c.id, label: `${c.name}${multi ? ` (${campusName[c.campusId]})` : ""}` }));

  const anns = annSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
    .filter((a) => ctx.orgWide || (a.audience?.campusId ? allowed.has(a.audience.campusId) : a.createdBy === ctx.user.uid)).slice(0, 30);
  const configured = !!emailConfig();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Communications</h1>
        <p className="mt-1 text-sm text-slate-500">Email delivery: <strong>{configured ? "configured (test it below before relying on it)" : "not configured"}</strong>. In-app notifications always work.</p>
      </div>
      <AnnouncementForm slug={tenantSlug} campuses={ctx.campuses.map((c) => ({ id: c.id, name: c.name }))} classes={classes} sections={sections} emailConfigured={configured} />
      <AlertSettings slug={tenantSlug} settings={alerts} canEdit={ctx.permissions.includes(P.SETTINGS_MANAGE) && ctx.orgWide} emailConfigured={configured} />

      <section className={card}>
        <h2 className="mb-2 text-base font-semibold">Recent announcements</h2>
        {anns.length === 0 ? <p className="text-sm text-slate-500">None sent yet.</p> : (
          <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {anns.map((a) => (
              <li key={a.id} className="py-3">
                <p className="font-medium">{a.title}</p>
                <p className="text-slate-500">{a.audience?.label} · {a.createdAt?.toDate?.().toISOString().slice(0, 10)}</p>
                <p className="text-xs text-slate-500">
                  {a.status === "SENT" ? `In-app: ${a.inAppCount}` : "Sending… (not completed)"} · {EMAIL_TEXT[a.emailStatus] || "—"}
                  {a.emailStatus === "SENT" || a.emailStatus === "PARTIAL" ? ` (${a.emailSent} sent${a.emailFailed ? `, ${a.emailFailed} failed` : ""}${a.emailOptedOut ? `, ${a.emailOptedOut} opted out` : ""}${a.emailNotSentOverCap ? `, ${a.emailNotSentOverCap} over the limit` : ""})` : ""}
                  {a.noPortalLogin ? ` · ${a.noPortalLogin} guardian(s) without a login` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
