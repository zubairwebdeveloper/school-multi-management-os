# Automatic parent alerts (Batch 19 / Phase 14, part 2)

Wired triggers
1. ABSENCE: when a student is newly marked ABSENT TODAY (dashboard attendance sheet or teacher portal). Past-date edits and
   approved corrections never alert (a late alert about an old day would confuse parents). Re-saving the sheet never re-alerts:
   a student is only "newly absent" when their stored status was not already ABSENT.
2. RESULT: when an exam is published, the parents of every student in it are told once (publishExam).
3. FEE REMINDER (deliberate, not automatic): Fees -> Reminders lists active students with overdue invoices in a campus; staff
   with FEES_MANAGE press one button. The list is recomputed on the server every time and limited to campuses the caller can access.
   At most one reminder per student per day.
Not wired yet: "new invoice generated" and homework. (Invoice generation is a large action; a reminder is the safer first step.)

How delivery works (lib/communications/notifyGuardians.js)
- Reaches only guardians with an ACTIVE parent account linked to THAT student (student -> studentGuardians -> guardians.linkedUid ->
  ACTIVE PARENT membership). Everyone else is counted as "unreached" and reported; nothing is sent to addresses taken from records.
- Idempotent: notification id = `${trigger}_${studentId}_${uid}`; existing notifications are never overwritten or re-marked unread.
- It runs AFTER the main transaction has committed and never throws, so a notification problem cannot undo attendance, results or
  anything else (the message tells staff when parents could not be notified).
- Email is OFF by default. It needs: the school's "Also email these alerts" switch, a configured provider, and a parent who has not opted
  out; max 100 emails per event. Messages are plain text about the parent's own child only.
- Switches (Communications page, SETTINGS_MANAGE + organization-wide): absence alerts (default on), result alerts (default on),
  email (default off). Stored in tenants/{id}.settings.notifications and audited.

Changes to earlier batches (complete replacements in this zip)
- dashboard/attendance/actions.js (Batch 9) and teacher/actions.js (Batch 13): absence alerts; all other behaviour unchanged.
- dashboard/examinations/results-actions.js (Batch 17): result alerts after publishing; correctMark unchanged.
- components/fees/FeesTabs.jsx (Batch 14): Reminders tab.
- dashboard/communications/page.jsx (Batch 18): automatic alert switches.
- No new Firestore index is needed (fee reminders reuse invoices campusId+status).

Limitations: a correction from ABSENT back to PRESENT does not retract an alert already sent; alerts are in-app/email only (no SMS or
WhatsApp); reminders do not yet respect per-guardian consent records or quiet hours; no unread badge in navigation; no tests yet
(absent twice, correction after alert, parent without login, suspended parent, duplicate reminder same day, notification failure not
undoing a save, cross-campus reminder attempt).
