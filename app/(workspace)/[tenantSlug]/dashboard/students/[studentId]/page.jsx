import Link from "next/link";
import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { PERMISSIONS as P } from "@/lib/permissions";
import { GENDERS } from "@/lib/validations/students";
import { StatusBadge, card } from "@/components/academics/shared";
import StudentActions from "@/components/students/StudentActions";

export const metadata = { title: "Student" };
export const dynamic = "force-dynamic";

export default async function StudentPage({ params }) {
  const { tenantSlug, studentId } = await params;
  const ctx = await getTenantContext(tenantSlug);
  if (!ctx.permissions.includes(P.STUDENTS_READ)) notFound();

  const base = adminDb.doc(`tenants/${ctx.tenantId}`);
  const snap = await base.collection("students").doc(studentId).get();
  if (!snap.exists) notFound();
  const s = snap.data();
  // Student-level authorization: the student's campus must be one the caller may access.
  if (!ctx.orgWide && !ctx.campuses.some((c) => c.id === s.campusId)) notFound();

  const [linkSnap, enrollSnap] = await Promise.all([
    base.collection("studentGuardians").where("studentId", "==", studentId).get(),
    base.collection("enrollments").where("studentId", "==", studentId).get(),
  ]);
  const links = linkSnap.docs.map((d) => ({ linkId: d.id, ...d.data() }));
  const gDocs = links.length ? await adminDb.getAll(...links.map((l) => base.collection("guardians").doc(l.guardianId))) : [];
  const gById = Object.fromEntries(gDocs.map((d) => [d.id, d.data() || {}]));
  const guardians = links
    .map((l) => ({ linkId: l.linkId, relationship: l.relationship, isPrimary: !!l.isPrimary, fullName: gById[l.guardianId]?.fullName || "—", phone: gById[l.guardianId]?.phone || "", email: gById[l.guardianId]?.email || "" }))
    .sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));

  const enrollments = enrollSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
  const refs = (k, c) => [...new Set([s[k], ...enrollments.map((e) => e[k])].filter(Boolean))].map((i) => base.collection(c).doc(i));
  const [cDocs, secDocs, sessDocs] = await Promise.all([
    adminDb.getAll(...refs("classId", "classes")), adminDb.getAll(...refs("sectionId", "sections")), adminDb.getAll(...refs("sessionId", "academicSessions")),
  ]);
  const name = (docs) => Object.fromEntries(docs.map((d) => [d.id, d.data()?.name || "—"]));
  const cName = name(cDocs), secName = name(secDocs), sessName = name(sessDocs);
  const campusName = ctx.campuses.find((c) => c.id === s.campusId)?.name || "—";

  // Options for "change section": active classes/sections of the student's campus in the active session.
  let classes = [], sections = [];
  const canUpdate = ctx.permissions.includes(P.STUDENTS_UPDATE);
  if (canUpdate && s.status === "ACTIVE") {
    const act = await base.collection("academicSessions").where("status", "==", "ACTIVE").limit(1).get();
    if (!act.empty) {
      const [cs, ss] = await Promise.all([
        base.collection("classes").where("campusId", "==", s.campusId).get(),
        base.collection("sections").where("sessionId", "==", act.docs[0].id).get(),
      ]);
      classes = cs.docs.filter((d) => d.data().status === "ACTIVE").map((d) => ({ id: d.id, campusId: d.data().campusId, name: d.data().name, level: d.data().level }))
        .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
      sections = ss.docs.filter((d) => d.data().status === "ACTIVE" && d.data().campusId === s.campusId)
        .map((d) => ({ id: d.id, classId: d.data().classId, name: d.data().name, capacity: d.data().capacity }));
    }
  }

  const student = {
    id: snap.id, status: s.status, firstName: s.firstName, lastName: s.lastName, gender: s.gender,
    dateOfBirth: s.dateOfBirth, address: s.address, phone: s.phone || "", previousSchool: s.previousSchool || "", classId: s.classId,
  };
  const row = (k, v) => (<div className="flex justify-between gap-4 py-1.5"><dt className="text-slate-500">{k}</dt><dd className="text-right font-medium">{v || "—"}</dd></div>);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href={`/${tenantSlug}/dashboard/students`} className="text-sm text-blue-600 hover:underline">← Students</Link>
        <h1 className="mt-2 flex items-center gap-3 text-2xl font-bold tracking-tight">
          {s.firstName} {s.lastName} <StatusBadge status={s.status === "WITHDRAWN" ? "CLOSED" : s.status} />
        </h1>
        <p className="font-mono text-xs text-slate-500">{s.admissionNumber}</p>
      </div>

      <section className={card}>
        <h2 className="mb-2 text-base font-semibold">Details</h2>
        <dl className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
          {row("Campus", campusName)}
          {row("Class", `${cName[s.classId] || "—"}${secName[s.sectionId] ? ` – ${secName[s.sectionId]}` : ""}`)}
          {row("Gender", GENDERS.find((g) => g.value === s.gender)?.label)}
          {row("Date of birth", s.dateOfBirth)}
          {row("Address", s.address)}
          {row("Phone", s.phone)}
          {row("Previous school", s.previousSchool)}
          {s.statusReason && row("Status reason", s.statusReason)}
        </dl>
      </section>

      <StudentActions slug={tenantSlug} student={student} guardians={guardians} classes={classes} sections={sections} canUpdate={canUpdate} />

      <section className={card}>
        <h2 className="mb-2 text-base font-semibold">Enrollment history</h2>
        <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
          {enrollments.map((e) => (
            <li key={e.id} className="flex items-center justify-between py-2">
              <span>{cName[e.classId] || "—"} – {secName[e.sectionId] || "—"} <span className="text-slate-500">· {sessName[e.sessionId] || "—"}</span></span>
              <span className="text-xs text-slate-500">{e.status === "ACTIVE" ? "Current" : (e.endReason || "Ended").replaceAll("_", " ").toLowerCase()}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
