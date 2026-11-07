import "server-only";
import { cache } from "react";
import { adminDb } from "@/lib/firebase/admin";

/**
 * What this teacher is responsible for in the ACTIVE session:
 * - sections where they are class teacher, and
 * - sections where they teach at least one subject (teachingAssignments).
 */
export const loadTeacherWork = cache(async (tc) => {
  const empty = { sections: [], subjects: {}, timetable: null };
  if (!tc.session) return empty;
  const base = adminDb.doc(`tenants/${tc.tenantId}`);
  const me = tc.employee.id;

  const [asSnap, ctSnap, subjSnap, clsSnap, ttSnap] = await Promise.all([
    base.collection("teachingAssignments").where("employeeId", "==", me).get(),
    base.collection("sections").where("classTeacherId", "==", me).get(),
    base.collection("subjects").get(),
    base.collection("classes").get(),
    base.collection("timetables").doc(`${tc.employee.campusId}_${tc.session.id}`).get(),
  ]);
  const subjects = Object.fromEntries(subjSnap.docs.map((d) => [d.id, d.data().name]));
  const classes = Object.fromEntries(clsSnap.docs.map((d) => [d.id, d.data()]));
  const assigns = asSnap.docs.map((d) => d.data()).filter((a) => a.sessionId === tc.session.id);
  const ctIds = new Set(ctSnap.docs.filter((d) => d.data().sessionId === tc.session.id).map((d) => d.id));

  const ids = [...new Set([...assigns.map((a) => a.sectionId), ...ctIds])];
  const secDocs = ids.length ? await adminDb.getAll(...ids.map((i) => base.collection("sections").doc(i))) : [];

  const sections = secDocs
    .filter((d) => d.exists && d.data().status === "ACTIVE" && (tc.campusIds.length === 0 || tc.campusIds.includes(d.data().campusId)))
    .map((d) => {
      const s = d.data();
      return {
        id: d.id, campusId: s.campusId, classId: s.classId, level: classes[s.classId]?.level ?? 0,
        label: `${classes[s.classId]?.name || ""} – ${s.name}`,
        isClassTeacher: ctIds.has(d.id),
        subjects: assigns.filter((a) => a.sectionId === d.id).map((a) => subjects[a.subjectId]).filter(Boolean).sort(),
      };
    })
    .sort((a, b) => a.level - b.level || a.label.localeCompare(b.label));

  return { sections, subjects, timetable: ttSnap.exists ? ttSnap.data() : null };
});
