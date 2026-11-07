import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { emailConfig, sendEmail } from "@/lib/communications/email";

export const ALERT_DEFAULTS = { absenceAlerts: true, resultAlerts: true, autoEmail: false };
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
const EMAIL_CAP = 100;

export async function getAlertSettings(tenantId) {
  const t = (await adminDb.doc(`tenants/${tenantId}`).get()).data();
  return { ...ALERT_DEFAULTS, ...(t?.settings?.notifications || {}) };
}

/**
 * Tells the parents of each student about something that happened to THEIR child.
 * - Reaches only guardians with an ACTIVE parent account linked to that student; everyone else is counted as "unreached".
 * - Idempotent: the notification id is `${keyPrefix}_${studentId}_${uid}` and existing ones are never overwritten, so re-saving
 *   attendance or re-running a reminder the same day cannot duplicate or re-unread anything.
 * - `flag` (e.g. "absenceAlerts") lets an administrator switch a trigger off.
 * - Email is sent only if the school enabled "autoEmail", a provider is configured, and the parent has not opted out (max 100 per call).
 * Never throws: callers use it AFTER their own transaction committed, and a notification problem must not undo that work.
 * items: [{ studentId, title, body }]
 */
export async function notifyGuardiansOfStudents({ tenantId, type, keyPrefix, items, flag = null }) {
  try {
    const settings = await getAlertSettings(tenantId);
    if (flag && settings[flag] === false) return { skipped: true };
    if (!items.length) return { created: 0, unreached: 0 };
    const base = adminDb.doc(`tenants/${tenantId}`);

    const sids = [...new Set(items.map((i) => i.studentId))];
    const linkSnaps = await Promise.all(chunk(sids, 30).map((c) => base.collection("studentGuardians").where("studentId", "in", c).get()));
    const guardiansOf = new Map();
    linkSnaps.forEach((s) => s.docs.forEach((d) => { const x = d.data(); (guardiansOf.get(x.studentId) || guardiansOf.set(x.studentId, new Set()).get(x.studentId)).add(x.guardianId); }));

    const gids = [...new Set([...guardiansOf.values()].flatMap((s) => [...s]))];
    const gDocs = (await Promise.all(chunk(gids, 300).map((c) => adminDb.getAll(...c.map((i) => base.collection("guardians").doc(i)))))).flat();
    const uidOf = new Map(gDocs.filter((g) => g.exists && g.data().linkedUid).map((g) => [g.id, g.data().linkedUid]));
    const uids = [...new Set(uidOf.values())];
    const mDocs = (await Promise.all(chunk(uids, 300).map((c) => adminDb.getAll(...c.map((i) => base.collection("members").doc(i)))))).flat();
    const member = new Map(mDocs.filter((m) => m.exists && m.data().status === "ACTIVE" && m.data().role === "PARENT").map((m) => [m.id, m.data()]));

    const entries = [], reached = new Set();
    for (const item of items) {
      for (const gid of guardiansOf.get(item.studentId) || []) {
        const uid = uidOf.get(gid);
        if (!uid || !member.has(uid)) continue;
        entries.push({ id: `${keyPrefix}_${item.studentId}_${uid}`, uid, m: member.get(uid), item });
        reached.add(item.studentId);
      }
    }
    const unreached = sids.filter((s) => !reached.has(s)).length;

    const refs = entries.map((e) => base.collection("notifications").doc(e.id));
    const exist = (await Promise.all(chunk(refs, 300).map((c) => adminDb.getAll(...c)))).flat();
    const fresh = entries.filter((_, i) => !exist[i].exists);

    for (const part of chunk(fresh, 400)) {
      const batch = adminDb.batch();
      part.forEach((e) => batch.set(base.collection("notifications").doc(e.id), {
        tenantId, recipientUid: e.uid, type, title: e.item.title, body: e.item.body, studentId: e.item.studentId, readAt: null, createdAt: new Date(),
      }));
      await batch.commit();
    }

    let emailed = 0, emailFailed = 0;
    if (settings.autoEmail && emailConfig()) {
      const queue = fresh.filter((e) => e.m.emailNotifications !== false && e.m.email).slice(0, EMAIL_CAP);
      for (const part of chunk(queue, 5)) {
        const res = await Promise.all(part.map((e) => sendEmail({ to: e.m.email, subject: e.item.title, text: `${e.item.body}\n\n(You can turn email notifications off in your portal's Notifications page.)` })));
        res.forEach((r) => (r.ok ? (emailed += 1) : (emailFailed += 1)));
      }
    }
    return { created: fresh.length, unreached, emailed, emailFailed };
  } catch {
    return { error: true };
  }
}
