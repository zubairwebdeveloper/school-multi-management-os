import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { ROLE_DEFINITIONS, SCOPES } from "@/lib/permissions";
import { hasCampus } from "@/lib/tenant/authorizeAction";

export class AudienceError extends Error {}
const bad = (m) => { throw new AudienceError(m); };
const chunk = (a, n) => Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n));
export const MAX_RECIPIENTS = 2000;

/**
 * Resolves WHO receives a message, entirely from server-side records, and re-checks that the sender may address that
 * campus / class / section. Only people who already have an ACTIVE account can receive anything.
 * Returns { label, recipients:[{uid,email,emailOptIn}], noLogin }.
 */
export async function resolveAudience(ctx, a) {
  const base = adminDb.doc(`tenants/${ctx.tenantId}`);

  if (a.type === "STAFF_CAMPUS") {
    if (!hasCampus(ctx, a.campusId)) bad("Choose a campus you have access to.");
    const campus = ctx.campuses.find((c) => c.id === a.campusId);
    const members = (await base.collection("members").get()).docs.map((d) => d.data());
    const recipients = members
      .filter((m) => m.status === "ACTIVE" && ROLE_DEFINITIONS[m.role] && ![SCOPES.LINKED, SCOPES.OWN].includes(ROLE_DEFINITIONS[m.role].scope))
      .filter((m) => ROLE_DEFINITIONS[m.role].scope === SCOPES.ORGANIZATION || (m.campusIds || []).includes(a.campusId))
      .map((m) => ({ uid: m.uid, email: m.email, emailOptIn: m.emailNotifications !== false }));
    return { label: `Staff · ${campus.name}`, recipients, noLogin: 0 };
  }

  // Parent audiences: students -> guardian links -> guardians with a portal login -> ACTIVE parent memberships
  let studentsQ, label;
  if (a.type === "PARENTS_SECTION") {
    const s = await base.collection("sections").doc(a.sectionId || "x").get();
    if (!s.exists || s.data().status !== "ACTIVE" || !hasCampus(ctx, s.data().campusId)) bad("Choose a section you have access to.");
    const c = await base.collection("classes").doc(s.data().classId).get();
    label = `Parents · ${c.data()?.name || ""} – ${s.data().name}`;
    studentsQ = base.collection("students").where("sectionId", "==", a.sectionId).where("status", "==", "ACTIVE");
  } else if (a.type === "PARENTS_CLASS") {
    const c = await base.collection("classes").doc(a.classId || "x").get();
    if (!c.exists || !hasCampus(ctx, c.data().campusId)) bad("Choose a class you have access to.");
    label = `Parents · ${c.data().name}`;
    studentsQ = base.collection("students").where("classId", "==", a.classId).where("status", "==", "ACTIVE");
  } else if (a.type === "PARENTS_CAMPUS") {
    if (!hasCampus(ctx, a.campusId)) bad("Choose a campus you have access to.");
    label = `Parents · ${ctx.campuses.find((c) => c.id === a.campusId).name}`;
    studentsQ = base.collection("students").where("campusId", "==", a.campusId).where("status", "==", "ACTIVE");
  } else bad("Choose who should receive this message.");

  const studs = await studentsQ.limit(MAX_RECIPIENTS + 1).get();
  if (studs.size > MAX_RECIPIENTS) bad("That audience is too large. Choose a class or section.");
  const sids = studs.docs.map((d) => d.id);
  const linkSnaps = await Promise.all(chunk(sids, 30).map((c) => base.collection("studentGuardians").where("studentId", "in", c).get()));
  const gids = [...new Set(linkSnaps.flatMap((s) => s.docs.map((d) => d.data().guardianId)))];
  const gDocs = (await Promise.all(chunk(gids, 300).map((c) => adminDb.getAll(...c.map((i) => base.collection("guardians").doc(i)))))).flat();
  const uids = [...new Set(gDocs.map((g) => g.data()?.linkedUid).filter(Boolean))];
  const noLogin = gDocs.filter((g) => g.exists && !g.data().linkedUid).length;
  const mDocs = (await Promise.all(chunk(uids, 300).map((c) => adminDb.getAll(...c.map((i) => base.collection("members").doc(i)))))).flat();
  const recipients = mDocs.filter((m) => m.exists && m.data().status === "ACTIVE" && m.data().role === "PARENT")
    .map((m) => ({ uid: m.id, email: m.data().email, emailOptIn: m.data().emailNotifications !== false }));
  return { label, recipients, noLogin };
}
