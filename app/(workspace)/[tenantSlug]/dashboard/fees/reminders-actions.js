"use server";
import { revalidatePath } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { DENIED, authorizeAction, hasCampus } from "@/lib/tenant/authorizeAction";
import { getTenantSettings } from "@/lib/tenant/getSettings";
import { PERMISSIONS as P } from "@/lib/permissions";
import { todayInZone } from "@/lib/utils/dates";
import { formatMoney } from "@/lib/utils/money";
import { auditInTx } from "@/lib/audit/tenantAudit";
import { notifyGuardiansOfStudents } from "@/lib/communications/notifyGuardians";

/** Overdue open invoices of ACTIVE students in one campus, grouped by student. Computed on the server every time. */
export async function overdueByStudent(tenantId, campusId, today, currency) {
  const base = adminDb.doc(`tenants/${tenantId}`);
  const snap = await base.collection("invoices").where("campusId", "==", campusId).where("status", "in", ["UNPAID", "PARTIAL"]).get();
  const overdue = snap.docs.map((d) => d.data()).filter((i) => i.dueDate < today);
  const ids = [...new Set(overdue.map((i) => i.studentId))];
  const docs = ids.length ? await adminDb.getAll(...ids.map((i) => base.collection("students").doc(i))) : [];
  const active = new Set(docs.filter((d) => d.exists && d.data().status === "ACTIVE").map((d) => d.id));
  const by = {};
  for (const i of overdue.filter((x) => active.has(x.studentId))) {
    const s = (by[i.studentId] ||= { studentId: i.studentId, name: i.studentName, adm: i.admissionNumber, count: 0, balance: 0 });
    s.count += 1; s.balance += i.balance;
  }
  return Object.values(by).sort((a, b) => b.balance - a.balance).map((s) => ({ ...s, text: formatMoney(s.balance, currency) }));
}

/**
 * Deliberate action (not automatic): reminds the parents of students with overdue invoices. Recomputed server-side,
 * limited to campuses the caller can access, at most one reminder per student per day (deterministic notification ids).
 */
export async function sendFeeReminders(slug, { campusId }) {
  const a = await authorizeAction(slug, { permission: P.FEES_MANAGE });
  if (a.error) return a.error;
  const { ctx } = a;
  if (!hasCampus(ctx, campusId)) return DENIED;
  const { timezone, currency } = await getTenantSettings(ctx.tenantId);
  const today = todayInZone(timezone);

  const list = await overdueByStudent(ctx.tenantId, campusId, today, currency);
  if (!list.length) return { ok: false, error: "No overdue invoices to remind about." };
  const res = await notifyGuardiansOfStudents({
    tenantId: ctx.tenantId, type: "FEE_REMINDER", keyPrefix: `feeremind_${today}`, flag: null,
    items: list.map((s) => ({ studentId: s.studentId, title: "Fee reminder", body: `${s.name}: ${s.count} overdue invoice(s), ${s.text} outstanding. Please pay at the school office. If you have already paid, please ignore this reminder.` })),
  });
  if (res.error) return { ok: false, error: "Reminders could not be created. Please try again." };

  await adminDb.runTransaction(async (tx) => {
    auditInTx(tx, ctx.tenantId, { action: "FEE_REMINDERS_SENT", actorUid: ctx.user.uid, targetType: "campus", targetId: campusId, meta: { students: list.length, created: res.created, unreached: res.unreached } });
  });
  revalidatePath(`/${slug}/dashboard/fees/reminders`);
  const already = list.length - res.unreached - res.created;
  return {
    ok: true,
    message: `${res.created} reminder(s) sent to parents.${already > 0 ? ` ${already} student(s) already got a reminder today.` : ""}${res.unreached ? ` ${res.unreached} student(s) have no parent with a portal login and were not reached.` : ""}${res.emailed ? ` ${res.emailed} email(s) sent.` : ""}`,
  };
}
