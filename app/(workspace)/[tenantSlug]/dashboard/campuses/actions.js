"use server";
import { revalidatePath } from "next/cache";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { getTenantContext } from "@/lib/tenant/getTenantContext";
import { PERMISSIONS as P } from "@/lib/permissions";
import { campusSchema } from "@/lib/validations/campus";
import { auditInTx } from "@/lib/audit/tenantAudit";

const DENIED = { ok: false, error: "You do not have permission to do this." };

function refresh(slug) {
  revalidatePath(`/${slug}/dashboard/campuses`);
  revalidatePath(`/${slug}/dashboard`);
}

function parse(input) {
  const r = campusSchema.safeParse(input);
  if (r.success) return { data: r.data };
  return { error: { ok: false, error: "Please fix the highlighted fields.", fieldErrors: r.error.flatten().fieldErrors } };
}

// Identity, tenant, role and campus access are ALL derived on the server.
// Nothing about tenantId / role / permissions is accepted from the client.
export async function createCampus(slug, input) {
  const ctx = await getTenantContext(slug);
  if (!ctx.permissions.includes(P.CAMPUS_MANAGE) || !ctx.orgWide) return DENIED;

  const { data, error } = parse(input);
  if (error) return error;

  const tenantRef = adminDb.doc(`tenants/${ctx.tenantId}`);
  const campusRef = tenantRef.collection("campuses").doc();

  try {
    await adminDb.runTransaction(async (tx) => {
      const [tenantSnap, campusesSnap] = await Promise.all([tx.get(tenantRef), tx.get(tenantRef.collection("campuses"))]);
      const all = campusesSnap.docs.map((d) => d.data());

      // Entitlement: enforced only when a plan has set a campus limit.
      const limit = tenantSnap.data()?.subscription?.limits?.campuses;
      const active = all.filter((c) => c.status === "ACTIVE").length;
      if (Number.isInteger(limit) && active >= limit) throw new Error("LIMIT");

      if (all.some((c) => c.name.toLowerCase() === data.name.toLowerCase())) throw new Error("NAME");
      if (data.code && all.some((c) => c.code === data.code)) throw new Error("CODE");

      tx.set(campusRef, {
        tenantId: ctx.tenantId,
        ...data,
        isPrimary: false,
        status: "ACTIVE",
        createdBy: ctx.user.uid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      auditInTx(tx, ctx.tenantId, {
        action: "CAMPUS_CREATED", actorUid: ctx.user.uid, targetType: "campus", targetId: campusRef.id,
      });
    });
  } catch (e) {
    const msg = {
      LIMIT: "Your plan's campus limit has been reached.",
      NAME: "A campus with this name already exists.",
      CODE: "A campus with this code already exists.",
    }[e.message];
    return { ok: false, error: msg || "Could not create the campus." };
  }

  refresh(slug);
  return { ok: true, id: campusRef.id };
}

export async function updateCampus(slug, campusId, input) {
  const ctx = await getTenantContext(slug);
  if (!ctx.permissions.includes(P.CAMPUS_MANAGE)) return DENIED;
  // Campus-scoped admins may only edit campuses they belong to.
  if (!ctx.orgWide && !ctx.campuses.some((c) => c.id === campusId)) return DENIED;

  const { data, error } = parse(input);
  if (error) return error;

  const tenantRef = adminDb.doc(`tenants/${ctx.tenantId}`);
  const campusRef = tenantRef.collection("campuses").doc(campusId);

  try {
    await adminDb.runTransaction(async (tx) => {
      const [snap, campusesSnap] = await Promise.all([tx.get(campusRef), tx.get(tenantRef.collection("campuses"))]);
      if (!snap.exists) throw new Error("MISSING");
      const others = campusesSnap.docs.filter((d) => d.id !== campusId).map((d) => d.data());
      if (others.some((c) => c.name.toLowerCase() === data.name.toLowerCase())) throw new Error("NAME");
      if (data.code && others.some((c) => c.code === data.code)) throw new Error("CODE");

      const before = snap.data();
      const changedFields = Object.keys(data).filter((k) => (before[k] ?? "") !== data[k]);
      if (changedFields.length === 0) return;

      tx.update(campusRef, { ...data, updatedBy: ctx.user.uid, updatedAt: FieldValue.serverTimestamp() });
      auditInTx(tx, ctx.tenantId, {
        action: "CAMPUS_UPDATED", actorUid: ctx.user.uid, targetType: "campus", targetId: campusId, changedFields,
      });
    });
  } catch (e) {
    const msg = {
      MISSING: "Campus not found.",
      NAME: "A campus with this name already exists.",
      CODE: "A campus with this code already exists.",
    }[e.message];
    return { ok: false, error: msg || "Could not save changes." };
  }

  refresh(slug);
  return { ok: true };
}

export async function setCampusStatus(slug, campusId, status) {
  const ctx = await getTenantContext(slug);
  if (!ctx.permissions.includes(P.CAMPUS_MANAGE) || !ctx.orgWide) return DENIED;
  if (!["ACTIVE", "INACTIVE"].includes(status)) return { ok: false, error: "Invalid status." };

  const tenantRef = adminDb.doc(`tenants/${ctx.tenantId}`);
  const campusRef = tenantRef.collection("campuses").doc(campusId);

  // Pre-check outside the transaction (aggregate queries are not allowed inside).
  if (status === "INACTIVE") {
    const enrolled = await tenantRef.collection("students")
      .where("campusId", "==", campusId).where("status", "==", "ACTIVE").count().get();
    if (enrolled.data().count > 0) {
      return { ok: false, error: "Move or withdraw the active students before deactivating this campus." };
    }
  }

  try {
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(campusRef);
      if (!snap.exists) throw new Error("MISSING");
      const c = snap.data();
      if (c.isPrimary && status === "INACTIVE") throw new Error("PRIMARY");
      if (c.status === status) return;

      tx.update(campusRef, { status, updatedBy: ctx.user.uid, updatedAt: FieldValue.serverTimestamp() });
      auditInTx(tx, ctx.tenantId, {
        action: status === "ACTIVE" ? "CAMPUS_REACTIVATED" : "CAMPUS_DEACTIVATED",
        actorUid: ctx.user.uid, targetType: "campus", targetId: campusId, changedFields: ["status"],
      });
    });
  } catch (e) {
    const msg = { MISSING: "Campus not found.", PRIMARY: "The primary campus cannot be deactivated." }[e.message];
    return { ok: false, error: msg || "Could not change the status." };
  }

  refresh(slug);
  return { ok: true };
}
