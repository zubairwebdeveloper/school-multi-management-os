import { notFound } from "next/navigation";
import { adminDb } from "@/lib/firebase/admin";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { PERMISSIONS as P } from "@/lib/permissions";
import ClassManager from "@/components/academics/ClassManager";

export const metadata = { title: "Classes & sections" };

export default async function Page({ params, searchParams }) {
  const { tenantSlug } = await params;
  const { session: sessionParam } = await searchParams;
  const ctx = await getTenantContext(tenantSlug);
  if (!ctx.permissions.includes(P.CAMPUS_VIEW)) notFound();

  const base = adminDb.doc(`tenants/${ctx.tenantId}`);
  const sessionSnap = await base.collection("academicSessions").orderBy("startDate", "desc").get();
  const sessions = sessionSnap.docs.map((d) => ({ id: d.id, name: d.data().name, status: d.data().status }));

  // Default: active session, else the newest one. Unknown ids fall back safely.
  const selected =
    sessions.find((s) => s.id === sessionParam) || sessions.find((s) => s.status === "ACTIVE") || sessions[0] || null;

  // Only campuses the user may access; the selected campus narrows further.
  const visible = ctx.selectedCampusId === "ALL" ? ctx.campuses : ctx.campuses.filter((c) => c.id === ctx.selectedCampusId);
  const ids = new Set(visible.map((c) => c.id));
  const names = Object.fromEntries(ctx.campuses.map((c) => [c.id, c.name]));

  const [cSnap, secSnap] = await Promise.all([
    base.collection("classes").get(),
    selected ? base.collection("sections").where("sessionId", "==", selected.id).get() : Promise.resolve({ docs: [] }),
  ]);

  const classes = cSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((c) => ids.has(c.campusId))
    .sort((a, b) => a.campusId.localeCompare(b.campusId) || a.level - b.level || a.name.localeCompare(b.name))
    .map((c) => ({ id: c.id, campusId: c.campusId, campusName: names[c.campusId] || "", name: c.name, level: c.level, curriculum: c.curriculum, status: c.status }));

  const sections = secSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((s) => ids.has(s.campusId))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((s) => ({ id: s.id, classId: s.classId, name: s.name, capacity: s.capacity, status: s.status }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Classes &amp; sections</h1>
        <p className="mt-1 text-sm text-slate-500">
          {ctx.selectedCampusId === "ALL" ? "All campuses" : names[ctx.selectedCampusId]}. Sections belong to one academic session.
        </p>
      </div>
      <ClassManager
        slug={tenantSlug}
        canManage={ctx.permissions.includes(P.ACADEMICS_MANAGE)}
        campuses={visible.map((c) => ({ id: c.id, name: c.name }))}
        sessions={sessions}
        selectedSessionId={selected?.id || null}
        classes={classes}
        sections={sections}
      />
    </div>
  );
}
