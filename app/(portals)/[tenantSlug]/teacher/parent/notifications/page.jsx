import { getParentContext } from "@/lib/tenant/getParentContext";
import { loadInbox } from "@/lib/notifications/inbox";
import NotificationInbox from "@/components/communications/NotificationInbox";

export const metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function ParentNotifications({ params }) {
  const { tenantSlug } = await params;
  const pc = await getParentContext(tenantSlug);
  const inbox = await loadInbox(pc.tenantId, pc.user.uid);
  return (<div className="space-y-5"><h1 className="text-2xl font-bold tracking-tight">Notifications</h1><NotificationInbox slug={tenantSlug} inbox={inbox} /></div>);
}
