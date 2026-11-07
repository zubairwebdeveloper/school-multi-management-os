"use client";
import { ConfirmButton, card, primaryBtn } from "@/components/academics/shared";
import { sendFeeReminders } from "@/app/(workspace)/[tenantSlug]/dashboard/fees/reminders-actions";

export default function ReminderPanel({ slug, campusId, count }) {
  return (
    <section className={card}>
      <h2 className="mb-1 text-base font-semibold">Send reminders</h2>
      <p className="mb-3 text-sm text-slate-500">Creates one in-app notification per parent for each student below. A student gets at most one reminder per day. Parents without a portal login are not reached; they are counted afterwards.</p>
      <ConfirmButton className={primaryBtn} confirm={`Send fee reminders for ${count} student(s)?`} run={() => sendFeeReminders(slug, { campusId })}>Send reminders to {count} student(s)</ConfirmButton>
    </section>
  );
}
