import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { loadInbox } from "@/lib/notifications/inbox";
import NotificationInbox from "@/components/communications/NotificationInbox";

export const metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage({ params }) {
  const { tenantSlug } = await params;
  const ctx = await getTenantContext(tenantSlug);
  const inbox = await loadInbox(ctx.tenantId, ctx.user.uid);
  return (
    <div className="max-w-3xl space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
      <NotificationInbox slug={tenantSlug} inbox={inbox} />
    </div>
  );
}
