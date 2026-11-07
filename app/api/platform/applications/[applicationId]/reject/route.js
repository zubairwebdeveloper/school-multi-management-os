import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { requirePlatformAdminApi } from "@/lib/auth/requirePlatformAdmin";
import { accessErrorResponse } from "@/lib/auth/requireTenantAccess";

export const runtime = "nodejs";

const bodySchema = z.object({ reason: z.string().trim().min(5, "Give a short reason").max(500) });

export async function POST(req, { params }) {
  let admin;
  try {
    admin = await requirePlatformAdminApi({ write: true });
  } catch (e) {
    return accessErrorResponse(e);
  }

  let body;
  try {
    body = bodySchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: e.issues?.[0]?.message || "Invalid request" }, { status: 400 });
  }

  const { applicationId } = await params;
  const appRef = adminDb.doc(`tenantApplications/${applicationId}`);

  try {
    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(appRef);
      if (!snap.exists) throw new Error("NOT_FOUND");
      if (!["PENDING", "UNDER_REVIEW"].includes(snap.data().status)) throw new Error("BAD_STATUS");

      const now = FieldValue.serverTimestamp();
      tx.update(appRef, {
        status: "REJECTED",
        rejectionReason: body.reason,
        reviewedBy: admin.uid,
        reviewedAt: now,
        updatedAt: now,
      });
      tx.set(adminDb.collection("platformAuditLogs").doc(), {
        action: "TENANT_APPLICATION_REJECTED",
        actorUid: admin.uid,
        applicationId,
        createdAt: now,
      });
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e.message === "NOT_FOUND") return NextResponse.json({ error: "Application not found" }, { status: 404 });
    if (e.message === "BAD_STATUS") return NextResponse.json({ error: "Application is not awaiting review" }, { status: 409 });
    return NextResponse.json({ error: "Rejection failed" }, { status: 500 });
  }
}
