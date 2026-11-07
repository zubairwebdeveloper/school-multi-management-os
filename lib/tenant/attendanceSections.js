import "server-only";
import { adminDb } from "@/lib/firebase/admin";

/** Sections of the ACTIVE (else newest non-closed) session the user may see, with display labels. */
export async function loadAttendanceSections(ctx) {
  const base = adminDb.doc(`tenants/${ctx.tenantId}`);
  const sess = await base.collection("academicSessions").get();
  const docs = sess.docs.map((d) => ({ id: d.id, ...d.data() }));
  const session = docs.find((s) => s.status === "ACTIVE") || null;
  if (!session) return { session: null, sections: [] };

  const visible = new Set((ctx.selectedCampusId === "ALL" ? ctx.campuses : ctx.campuses.filter((c) => c.id === ctx.selectedCampusId)).map((c) => c.id));
  const [secSnap, clsSnap] = await Promise.all([
    base.collection("sections").where("sessionId", "==", session.id).get(),
    base.collection("classes").get(),
  ]);
  const cls = Object.fromEntries(clsSnap.docs.map((d) => [d.id, d.data()]));
  const campusName = Object.fromEntries(ctx.campuses.map((c) => [c.id, c.name]));
  const multi = ctx.selectedCampusId === "ALL" && ctx.campuses.length > 1;

  const sections = secSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((s) => s.status === "ACTIVE" && visible.has(s.campusId) && cls[s.classId])
    .sort((a, b) => (cls[a.classId].level - cls[b.classId].level) || a.name.localeCompare(b.name))
    .map((s) => ({
      id: s.id, campusId: s.campusId, sessionId: s.sessionId,
      label: `${cls[s.classId].name} – ${s.name}${multi ? ` (${campusName[s.campusId]})` : ""}`,
    }));
  return { session: { id: session.id, name: session.name, startDate: session.startDate, endDate: session.endDate }, sections };
}
