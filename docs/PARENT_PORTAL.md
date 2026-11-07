# Parent portal (Batch 15 / Phase 13, part 2)

Routes: /{slug}/parent/dashboard, /attendance, /fees, /timetable, /receipt/{paymentId}   (dashboard layout already redirects LINKED roles here)
Admin side: /{slug}/dashboard/settings/parent-access (invite / revoke / suspend / restore)

How a parent gets in
1. Staff (STUDENTS_UPDATE or SETTINGS_MANAGE, with access to every campus of the guardian's children) opens Parent portal access,
   finds a student by admission number and creates an invitation for one of the student's linked guardians.
   Email delivery is NOT connected (Phase 14): the link is shown once, copied and shared manually. Only its SHA-256 hash is stored.
2. The parent signs in / registers with that email, verifies it and accepts (Batch 12 flow). acceptInvitation now handles
   kind:"GUARDIAN": it re-validates the token, expiry, email, the guardian record (not already linked) and that at least one child is
   still linked, then creates members/{uid} {role PARENT, guardianId} and sets guardians.linkedUid in the same transaction.
3. One login covers all of the parent's children (siblings share one guardian record from Batch 8).

Access model (lib/tenant/getParentContext.js)
- Every request: valid session -> tenant ACTIVE -> membership ACTIVE with a LINKED-scope role (PARENT) -> guardian doc exists and
  guardians.linkedUid == this user -> children = students linked through studentGuardians.guardianId. Anything else is 404/redirect.
- A child id in the URL is only used to PICK from that server-built list; an unknown id falls back to the first child. Receipts are
  checked against the same list. No other student's data can be requested.
- Parents see: attendance (month view + summary), fees (billed / paid / outstanding, invoice lines, CONFIRMED payments and receipts
  only: never unverified records, recorder emails or internal notes), the published class timetable (subject, teacher, room).
- Read-only: the portal has no write actions, so there is nothing to forge. Online payment is not offered (shown on the page).

Changes to earlier batches (complete replacements are in this zip)
- app/(auth)/invitation/actions.js (Batch 12): adds guardian invitations; staff behaviour unchanged.
- settings/page.jsx (Batch 12): adds the Parent portal access card.
- firestore.indexes.json: adds studentAttendance by studentId+date. Deploy: firebase deploy --only firestore:indexes

Not yet: per-guardian permissions (e.g. fees-only), parent-teacher messaging, homework/results/report cards (not built yet),
announcements, leave applications, consent forms, notifications for absence/fees (Phase 14), student portal, guardian self-service
profile, invitation resend, tests (parent A cannot open parent B's child or receipt; suspended parent; unlinked/relinked child;
wrong-email accept; forged child/payment ids).
