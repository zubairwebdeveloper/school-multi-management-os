# Communications: notifications, announcements, email (Batch 18 / Phase 14, part 1)

Dashboard: /communications (send + history), /notifications. Teacher portal: /teacher/notifications. Parent portal: /parent/notifications.

What is real today
- IN-APP notifications: always work. Stored in tenants/{id}/notifications/{announcementId}_{uid} (deterministic ids, so a retry can
  never duplicate). Each person only ever reads their own (queried by recipientUid from the session).
- EMAIL: works ONLY when the server has a provider configured. Nothing is reported as sent unless the provider accepted it.
  Supported: Resend. Env: EMAIL_PROVIDER=resend, RESEND_API_KEY, EMAIL_FROM ("School Name <noreply@your-domain>"), APP_URL
  (https://your-app-domain, used to build invitation links). The adapter (lib/communications/email.js) is NOT yet tested against a
  live account: use "Send a test email to me" on the Communications page first. No SMS or WhatsApp provider exists yet.

Announcements (CAMPUS_MANAGE + access to the addressed campus/class/section)
- Audiences: all parents of a campus, parents of a class, parents of a section, staff of a campus. Recipients are resolved on the
  server from student -> guardian -> portal login -> ACTIVE membership records; the client never sends recipient lists.
- Only people with an active account can receive anything. Guardians without a portal login are counted and reported
  ("N guardian(s) have no portal login"); no mail is sent to addresses scraped from records.
- Email is optional per announcement, skips people who turned it off (member.emailNotifications === false), and is capped at
  200 recipients per announcement (everyone still gets the in-app notification). The history shows the REAL outcome:
  Email not requested / NOT sent (no provider) / sent / partial / failed, plus counts.
- Plain text only (rendered with whitespace preserved, never as HTML). Limits: 2000 recipients, 2000 characters, title 120.
- Audited. Opt-out: every user can switch "Email me announcements" off on their Notifications page.

Invitation emails
- After creating a staff or guardian invitation link, "Email this link" sends it to the address the invitation was created for.
  The server re-verifies the token, never takes a recipient from the client, throttles to one email per 10 minutes per invitation,
  and refuses to send if APP_URL or the provider is missing.

Changes to earlier batches (complete replacements in this zip)
- components/team/TeamManager.jsx (Batch 12) and components/parent/ParentAccessManager.jsx (Batch 15): "Email this link" button.
- components/teacher/TeacherShell.jsx and components/parent/ParentShell.jsx: Notifications tab.
- lib/navigation/sections.js: Notifications item (visible to everyone in the dashboard).
- firestore.indexes.json: adds notifications by recipientUid + createdAt. Deploy: firebase deploy --only firestore:indexes

Not yet: automatic triggers (absence alert, fee invoice/reminder, result published, homework) - a notification helper exists in the
announcement code path and wiring these into attendance/fees/exams actions is the next step; templates, scheduled campaigns,
audience segmentation beyond the four above, consent records per guardian, unread badge counts in the navigation, resend of failed
emails, retry of an announcement that stopped mid-send (it shows "Sending… (not completed)"), SMS/WhatsApp/push, tests
(announcement to a section outside the sender's campus, opted-out users, provider failure, replayed token for invitation email).
