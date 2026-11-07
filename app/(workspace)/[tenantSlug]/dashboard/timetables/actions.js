"use server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { DENIED, authorizeAction, hasCampus } from "@/lib/tenant/authorizeAction";
import { getTenantTimezone } from "@/lib/tenant/getTimezone";
import { PERMISSIONS as P } from "@/lib/permissions";
import { todayInZone } from "@/lib/utils/dates";
import { weekdayOf } from "@/lib/utils/weekday";
import { parseNested } from "@/lib/validations/students";
import { clearLessonSchema, lessonSchema, periodsSchema, substitutionSchema } from "@/lib/validations/timetable";
import { auditInTx } from "@/lib/audit/tenantAudit";

const base = (ctx) => `tenants/${ctx.tenantId}`;
const ts = () => FieldValue.serverTimestamp();
const refresh = (slug) => revalidatePath(`/${slug}/dashboard/timetables`, "layout");
const manage = (slug) => authorizeAction(slug, { permission: P.ACADEMICS_MANAGE });

class UserError extends Error {}
const fail = (m) => { throw new UserError(m); };
function result(e, fallback) {
  if (e instanceof UserError) return { ok: false, error: e.message };
  if (e.message === "DENIED") return DENIED;
  return { ok: false, error: fallback };
}

async function activeSession(tx, ctx) {
  const q = await tx.get(adminDb.collection(`${base(ctx)}/academicSessions`).where("status", "==", "ACTIVE").limit(1));
  if (q.empty) fail("There is no active academic session.");
  return { id: q.docs[0].id, ...q.docs[0].data() };
}

async function openSection(tx, ctx, sectionId) {
  const s = await tx.get(adminDb.doc(`${base(ctx)}/sections/${sectionId}`));
  if (!s.exists || s.data().status !== "ACTIVE") fail("Choose an active section.");
  const sec = s.data();
  if (!hasCampus(ctx, sec.campusId)) throw new Error("DENIED");
  const sess = await tx.get(adminDb.doc(`${base(ctx)}/academicSessions/${sec.sessionId}`));
  if (!sess.exists || sess.data().status !== "ACTIVE") fail("The section's academic session must be active.");
  return { id: s.id, ...sec };
}

async function sectionLabel(tx, ctx, sectionId) {
  const s = await tx.get(adminDb.doc(`${base(ctx)}/sections/${sectionId}`));
  const c = s.exists ? await tx.get(adminDb.doc(`${base(ctx)}/classes/${s.data().classId}`)) : null;
  return s.exists ? `${c?.data()?.name || ""} – ${s.data().name}` : "another section";
}

const entriesCol = (ctx) => adminDb.collection(`${base(ctx)}/timetableEntries`);

// ---------------- period / day setup ----------------
export async function savePeriods(slug, input) {
  const a = await manage(slug);
  if (a.error) return a.error;
  const { ctx } = a;
  const p = parseNested(periodsSchema, input);
  if (p.error) {
    const first = Object.values(p.error.fieldErrors || {})[0]?.[0];
    return { ...p.error, error: first || p.error.error };
  }
  const { campusId, days, periods } = p.data;
  if (!hasCampus(ctx, campusId)) return DENIED;

  try {
    await adminDb.runTransaction(async (tx) => {
      const session = await activeSession(tx, ctx);
      const ttRef = adminDb.doc(`${base(ctx)}/timetables/${campusId}_${session.id}`);
      const [tt, used] = await Promise.all([
        tx.get(ttRef),
        tx.get(entriesCol(ctx).where("campusId", "==", campusId).where("sessionId", "==", session.id)),
      ]);
      const existing = tt.exists ? tt.data() : null;
      const oldIds = new Set((existing?.periods || []).map((x) => x.id));
      const keepIds = new Set(periods.map((x) => x.id).filter((id) => oldIds.has(id)));

      // Do not silently destroy lessons: removed periods/days must be emptied first.
      for (const e of used.docs.map((d) => d.data())) {
        if (!keepIds.has(e.periodId)) fail("Remove the lessons in a period before deleting it.");
        if (!days.includes(e.day)) fail("Remove the lessons on a day before disabling it.");
      }
      const final = periods.map((x) => ({
        id: keepIds.has(x.id) ? x.id : `p${crypto.randomUUID().slice(0, 8)}`,
        name: x.name, start: x.start, end: x.end, isBreak: !!x.isBreak,
      }));
      // A period that now is a break cannot hold lessons.
      for (const e of used.docs.map((d) => d.data())) if (final.find((f) => f.id === e.periodId)?.isBreak) fail("A period with lessons cannot be turned into a break.");

      tx.set(ttRef, {
        tenantId: ctx.tenantId, campusId, sessionId: session.id, days, periods: final,
        status: existing?.status || "DRAFT", version: (existing?.version || 0) + 1,
        updatedBy: ctx.user.uid, updatedAt: ts(), ...(existing ? {} : { createdAt: ts() }),
      });
      auditInTx(tx, ctx.tenantId, { action: "TIMETABLE_STRUCTURE_SAVED", actorUid: ctx.user.uid, targetType: "timetable", targetId: ttRef.id, meta: { campusId } });
    });
  } catch (e) { return result(e, "Could not save the period setup."); }
  refresh(slug);
  return { ok: true, message: "Periods saved." };
}

export async function setPublished(slug, { campusId, published }) {
  const a = await manage(slug);
  if (a.error) return a.error;
  const { ctx } = a;
  if (!hasCampus(ctx, campusId)) return DENIED;
  try {
    await adminDb.runTransaction(async (tx) => {
      const session = await activeSession(tx, ctx);
      const ttRef = adminDb.doc(`${base(ctx)}/timetables/${campusId}_${session.id}`);
      const [tt, any] = await Promise.all([tx.get(ttRef), tx.get(entriesCol(ctx).where("campusId", "==", campusId).where("sessionId", "==", session.id).limit(1))]);
      if (!tt.exists) fail("Set up the periods first.");
      if (published && any.empty) fail("Add at least one lesson before publishing.");
      tx.update(ttRef, { status: published ? "PUBLISHED" : "DRAFT", ...(published ? { publishedAt: ts(), publishedBy: ctx.user.uid } : {}), updatedAt: ts() });
      auditInTx(tx, ctx.tenantId, { action: published ? "TIMETABLE_PUBLISHED" : "TIMETABLE_UNPUBLISHED", actorUid: ctx.user.uid, targetType: "timetable", targetId: ttRef.id });
    });
  } catch (e) { return result(e, "Could not change the publish status."); }
  refresh(slug);
  return { ok: true, message: published ? "Timetable published." : "Timetable moved back to draft." };
}

// ---------------- lessons ----------------
/** Throws UserError describing the first clash, or returns normally when the slot is free for this teacher/room. */
async function assertNoClash(tx, ctx, { entryId, sessionId, campusId, employeeId, teacherName, day, periodId, roomKey }) {
  const t = await tx.get(entriesCol(ctx).where("employeeId", "==", employeeId).where("day", "==", day).where("periodId", "==", periodId).where("sessionId", "==", sessionId));
  const tc = t.docs.find((d) => d.id !== entryId);
  if (tc) fail(`${teacherName} is already teaching ${await sectionLabel(tx, ctx, tc.data().sectionId)} in this period.`);
  if (roomKey) {
    const r = await tx.get(entriesCol(ctx).where("campusId", "==", campusId).where("roomKey", "==", roomKey).where("day", "==", day).where("periodId", "==", periodId).where("sessionId", "==", sessionId));
    const rc = r.docs.find((d) => d.id !== entryId);
    if (rc) fail(`That room is already used by ${await sectionLabel(tx, ctx, rc.data().sectionId)} in this period.`);
  }
}

export async function setLesson(slug, input) {
  const a = await manage(slug);
  if (a.error) return a.error;
  const { ctx } = a;
  const p = parseNested(lessonSchema, input);
  if (p.error) return p.error;
  const { sectionId, day, periodId, subjectId, room } = p.data;
  const entryId = `${sectionId}_${day}_${periodId}`;
  const ref = entriesCol(ctx).doc(entryId);
  const roomKey = room.trim().toLowerCase();

  try {
    await adminDb.runTransaction(async (tx) => {
      const sec = await openSection(tx, ctx, sectionId);
      const [tt, asg, existing] = await Promise.all([
        tx.get(adminDb.doc(`${base(ctx)}/timetables/${sec.campusId}_${sec.sessionId}`)),
        tx.get(adminDb.doc(`${base(ctx)}/teachingAssignments/${sectionId}_${subjectId}`)),
        tx.get(ref),
      ]);
      if (!tt.exists) fail("Set up the periods first.");
      const cfg = tt.data();
      const period = cfg.periods.find((x) => x.id === periodId);
      if (!period || period.isBreak) fail("Choose a lesson period (not a break).");
      if (!cfg.days.includes(day)) fail("That day is not part of the timetable.");
      if (!asg.exists) fail("Assign a teacher to this subject first (Teachers & staff → Class assignments).");

      const employeeId = asg.data().employeeId; // taken from the assignment, never from the client
      const emp = await tx.get(adminDb.doc(`${base(ctx)}/employees/${employeeId}`));
      if (!emp.exists || emp.data().status !== "ACTIVE") fail("The assigned teacher is not active. Reassign the subject.");
      const teacherName = `${emp.data().firstName} ${emp.data().lastName}`;

      await assertNoClash(tx, ctx, { entryId, sessionId: sec.sessionId, campusId: sec.campusId, employeeId, teacherName, day, periodId, roomKey });

      tx.set(ref, {
        tenantId: ctx.tenantId, campusId: sec.campusId, sessionId: sec.sessionId, classId: sec.classId, sectionId,
        subjectId, employeeId, room, roomKey, day, periodId,
        createdAt: existing.exists ? existing.data().createdAt : ts(), updatedBy: ctx.user.uid, updatedAt: ts(),
      });
      auditInTx(tx, ctx.tenantId, {
        action: existing.exists ? "LESSON_CHANGED" : "LESSON_ADDED", actorUid: ctx.user.uid, targetType: "timetableEntry", targetId: entryId,
        meta: { sectionId, day, periodId, subjectId, published: cfg.status === "PUBLISHED" },
      });
    });
  } catch (e) { return result(e, "Could not save the lesson."); }
  refresh(slug);
  return { ok: true, message: "Lesson saved." };
}

export async function clearLesson(slug, input) {
  const a = await manage(slug);
  if (a.error) return a.error;
  const { ctx } = a;
  const p = parseNested(clearLessonSchema, input);
  if (p.error) return p.error;
  const { sectionId, day, periodId } = p.data;
  const entryId = `${sectionId}_${day}_${periodId}`;
  const ref = entriesCol(ctx).doc(entryId);
  try {
    await adminDb.runTransaction(async (tx) => {
      const sec = await openSection(tx, ctx, sectionId);
      const [snap, subs] = await Promise.all([tx.get(ref), tx.get(adminDb.collection(`${base(ctx)}/timetableSubstitutions`).where("entryId", "==", entryId))]);
      if (!snap.exists) fail("There is no lesson in this slot.");
      tx.delete(ref);
      subs.docs.forEach((d) => tx.delete(d.ref)); // substitutions for a lesson that no longer exists
      auditInTx(tx, ctx.tenantId, { action: "LESSON_REMOVED", actorUid: ctx.user.uid, targetType: "timetableEntry", targetId: entryId, meta: { sectionId, campusId: sec.campusId, removedSubstitutions: subs.size } });
    });
  } catch (e) { return result(e, "Could not remove the lesson."); }
  refresh(slug);
  return { ok: true, message: "Lesson removed." };
}

/** Re-derives each lesson's teacher from the current class assignments (after teachers were reassigned). */
export async function syncSectionTeachers(slug, { sectionId }) {
  const a = await manage(slug);
  if (a.error) return a.error;
  const { ctx } = a;
  if (!sectionId) return { ok: false, error: "Invalid request." };
  let updated = 0, unresolved = 0;
  try {
    await adminDb.runTransaction(async (tx) => {
      updated = 0; unresolved = 0;
      const sec = await openSection(tx, ctx, sectionId);
      const [entries, asgs] = await Promise.all([
        tx.get(entriesCol(ctx).where("sectionId", "==", sectionId)),
        tx.get(adminDb.collection(`${base(ctx)}/teachingAssignments`).where("sectionId", "==", sectionId)),
      ]);
      const current = Object.fromEntries(asgs.docs.map((d) => [d.data().subjectId, d.data().employeeId]));
      for (const d of entries.docs) {
        const e = d.data();
        const want = current[e.subjectId];
        if (!want) { unresolved += 1; continue; }
        if (want === e.employeeId) continue;
        const emp = await tx.get(adminDb.doc(`${base(ctx)}/employees/${want}`));
        if (!emp.exists || emp.data().status !== "ACTIVE") { unresolved += 1; continue; }
        await assertNoClash(tx, ctx, { entryId: d.id, sessionId: sec.sessionId, campusId: sec.campusId, employeeId: want, teacherName: `${emp.data().firstName} ${emp.data().lastName}`, day: e.day, periodId: e.periodId, roomKey: "" });
        tx.update(d.ref, { employeeId: want, updatedBy: ctx.user.uid, updatedAt: ts() });
        updated += 1;
      }
      if (updated) auditInTx(tx, ctx.tenantId, { action: "LESSON_TEACHERS_SYNCED", actorUid: ctx.user.uid, targetType: "section", targetId: sectionId, meta: { updated } });
    });
  } catch (e) { return result(e, "Could not update teachers."); }
  refresh(slug);
  return { ok: true, message: `${updated} lesson(s) updated.${unresolved ? ` ${unresolved} still have no valid teacher assignment.` : ""}` };
}

// ---------------- substitutions ----------------
export async function createSubstitution(slug, input) {
  const a = await manage(slug);
  if (a.error) return a.error;
  const { ctx } = a;
  const p = parseNested(substitutionSchema, input);
  if (p.error) return p.error;
  const { date, sectionId, periodId, substituteEmployeeId, reason } = p.data;

  const today = todayInZone(await getTenantTimezone(ctx.tenantId));
  if (date < today) return { ok: false, error: "Substitutions are for today or a future date." };
  const day = weekdayOf(date);
  const entryId = `${sectionId}_${day}_${periodId}`;
  const ref = adminDb.doc(`${base(ctx)}/timetableSubstitutions/${entryId}_${date}`);

  try {
    await adminDb.runTransaction(async (tx) => {
      const sec = await openSection(tx, ctx, sectionId);
      const [sess, entry, sub, busyRegular, busySub] = await Promise.all([
        tx.get(adminDb.doc(`${base(ctx)}/academicSessions/${sec.sessionId}`)),
        tx.get(entriesCol(ctx).doc(entryId)),
        tx.get(adminDb.doc(`${base(ctx)}/employees/${substituteEmployeeId}`)),
        tx.get(entriesCol(ctx).where("employeeId", "==", substituteEmployeeId).where("day", "==", day).where("periodId", "==", periodId).where("sessionId", "==", sec.sessionId)),
        tx.get(adminDb.collection(`${base(ctx)}/timetableSubstitutions`).where("substituteEmployeeId", "==", substituteEmployeeId).where("date", "==", date).where("periodId", "==", periodId)),
      ]);
      const s = sess.data();
      if (date < s.startDate || date > s.endDate) fail("That date is outside the academic session.");
      if (!entry.exists) fail("There is no lesson in that section on that weekday and period.");
      const se = sub.data();
      if (!sub.exists || se.status !== "ACTIVE" || se.staffType !== "TEACHING" || se.campusId !== sec.campusId) fail("Choose an active teacher from the same campus.");
      if (entry.data().employeeId === substituteEmployeeId) fail("The substitute is already the lesson's teacher.");
      const name = `${se.firstName} ${se.lastName}`;
      if (!busyRegular.empty) fail(`${name} has their own lesson in that period.`);
      if (busySub.docs.some((d) => d.id !== ref.id)) fail(`${name} is already covering another lesson in that period on that date.`);

      tx.set(ref, {
        tenantId: ctx.tenantId, campusId: sec.campusId, sessionId: sec.sessionId, sectionId, entryId, date, day, periodId,
        originalEmployeeId: entry.data().employeeId, substituteEmployeeId, reason, createdBy: ctx.user.uid, createdAt: ts(),
      });
      auditInTx(tx, ctx.tenantId, { action: "SUBSTITUTION_CREATED", actorUid: ctx.user.uid, targetType: "timetableSubstitution", targetId: ref.id, meta: { sectionId, date, periodId } });
    });
  } catch (e) { return result(e, "Could not create the substitution."); }
  refresh(slug);
  return { ok: true, message: "Substitute assigned." };
}

export async function removeSubstitution(slug, substitutionId) {
  const a = await manage(slug);
  if (a.error) return a.error;
  const { ctx } = a;
  const today = todayInZone(await getTenantTimezone(ctx.tenantId));
  const ref = adminDb.doc(`${base(ctx)}/timetableSubstitutions/${substitutionId}`);
  try {
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) fail("Substitution not found.");
      if (!hasCampus(ctx, snap.data().campusId)) throw new Error("DENIED");
      if (snap.data().date < today) fail("Past substitutions are kept as a record.");
      tx.delete(ref);
      auditInTx(tx, ctx.tenantId, { action: "SUBSTITUTION_REMOVED", actorUid: ctx.user.uid, targetType: "timetableSubstitution", targetId: substitutionId });
    });
  } catch (e) { return result(e, "Could not remove the substitution."); }
  refresh(slug);
  return { ok: true, message: "Substitution removed." };
}
