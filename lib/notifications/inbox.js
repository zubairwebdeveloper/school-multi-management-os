import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { getTenantSettings } from "@/lib/tenant/getSettings";

/** The signed-in user's OWN notifications only (queried by recipientUid). */
export async function loadInbox(tenantId, uid) {
  const { timezone } = await getTenantSettings(tenantId);
  const fmt = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, dateStyle: "medium", timeStyle: "short" });
  const [snap, member] = await Promise.all([
    adminDb.collection(`tenants/${tenantId}/notifications`).where("recipientUid", "==", uid).orderBy("createdAt", "desc").limit(50).get(),
    adminDb.doc(`tenants/${tenantId}/members/${uid}`).get(),
  ]);
  return {
    emailEnabled: member.data()?.emailNotifications !== false,
    items: snap.docs.map((d) => ({ id: d.id, title: d.data().title, body: d.data().body, unread: !d.data().readAt, when: d.data().createdAt ? fmt.format(d.data().createdAt.toDate()) : "" })),
  };
}
