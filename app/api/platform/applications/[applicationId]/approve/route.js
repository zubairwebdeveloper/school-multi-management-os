import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requirePlatformAdminApi } from "@/lib/auth/requirePlatformAdmin";
import { accessErrorResponse } from "@/lib/auth/requireTenantAccess";
import { slugCandidates } from "@/lib/tenant/slug";

export const runtime = "nodejs";

export async function POST(_req, { params }) {
  let admin;
  try {
    admin = await requirePlatformAdminApi({ write: true });
  } catch (e) {
    return accessErrorResponse(e);
  }

  const { applicationId } = await params;
  const appRef = adminDb.doc(`tenantApplications/${applicationId}`);

  try {
    const result = await adminDb.runTransaction(async (tx) => {
      // ---- ALL READS FIRST ----
      const appSnap = await tx.get(appRef);
      if (!appSnap.exists) throw new Error("NOT_FOUND");
      const app = appSnap.data();

      // Idempotent: a retried approval returns the same tenant
      if (app.status === "APPROVED" && app.tenantId) {
        return { tenantId: app.tenantId, slug: app.tenantSlug, alreadyApproved: true };
      }
      if (!["PENDING", "UNDER_REVIEW"].includes(app.status)) throw new Error("BAD_STATUS");

      const candidates = slugCandidates(app.organization.name, applicationId);
      const slugSnaps = await Promise.all(
        candidates.map((s) => tx.get(adminDb.doc(`tenantSlugs/${s}`)))
      );
      const idx = slugSnaps.findIndex((s) => !s.exists);
      if (idx === -1) throw new Error("SLUG_UNAVAILABLE");
      const slug = candidates[idx];

      // ---- WRITES ----
      const tenantRef = adminDb.collection("tenants").doc();
      const campusRef = tenantRef.collection("campuses").doc();
      const memberRef = tenantRef.collection("members").doc(app.applicantUid);
      const now = FieldValue.serverTimestamp();
      const org = app.organization;
      const campus = app.initialCampus;

      tx.set(adminDb.doc(`tenantSlugs/${slug}`), { tenantId: tenantRef.id, createdAt: now });

      tx.set(tenantRef, {
        slug,
        status: "ACTIVE",
        ownerUid: app.applicantUid,
        sourceApplicationId: applicationId,
        profile: {
          name: org.name,
          institutionType: org.institutionType,
          contactEmail: org.contactEmail,
          contactPhone: org.contactPhone,
          website: org.website || "",
          city: org.city,
          country: org.country,
          address: org.address,
        },
        academicSettings: { curricula: org.curricula },
        settings: { timezone: "Asia/Karachi", currency: "PKR", defaultLanguage: "en" },
        // Plan is assigned by the platform admin later; nothing is hardcoded here.
        subscription: { status: "PENDING_PLAN", planId: null },
        createdAt: now,
        updatedAt: now,
      });

      tx.set(campusRef, {
        tenantId: tenantRef.id,
        name: campus.name,
        city: campus.city,
        address: campus.address,
        phone: campus.phone,
        isPrimary: true,
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      });

      // Owner membership: organization-wide scope comes from the role definition
      tx.set(memberRef, {
        uid: app.applicantUid,
        email: app.applicantEmail,
        role: "OWNER",
        status: "ACTIVE",
        campusIds: [],
        extraPermissions: [],
        createdAt: now,
        updatedAt: now,
      });

      tx.update(appRef, {
        status: "APPROVED",
        tenantId: tenantRef.id,
        tenantSlug: slug,
        reviewedBy: admin.uid,
        reviewedAt: now,
        updatedAt: now,
      });

      tx.set(adminDb.collection("platformAuditLogs").doc(), {
        action: "TENANT_APPLICATION_APPROVED",
        actorUid: admin.uid,
        applicationId,
        tenantId: tenantRef.id,
        createdAt: now,
      });

      return { tenantId: tenantRef.id, slug, alreadyApproved: false };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const map = {
      NOT_FOUND: [404, "Application not found"],
      BAD_STATUS: [409, "Application is not awaiting review"],
      SLUG_UNAVAILABLE: [409, "Could not allocate a workspace address"],
    };
    const [status, error] = map[e.message] || [500, "Approval failed"];
    return NextResponse.json({ error }, { status });
  }
}
