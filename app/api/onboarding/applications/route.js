import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { applicationSchema } from "@/lib/validations/onboarding";
import { ACTIVE_APPLICATION_STATUSES, APPLICATION_STATUS } from "@/lib/onboarding/constants";

export const runtime = "nodejs";

// GET: the signed-in user's latest application (own data only)
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const snap = await adminDb
    .collection("tenantApplications")
    .where("applicantUid", "==", user.uid)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (snap.empty) return NextResponse.json({ application: null });
  const d = snap.docs[0];
  const { organization, status, rejectionReason } = d.data();
  return NextResponse.json({
    application: { id: d.id, status, rejectionReason: rejectionReason || null, organizationName: organization?.name },
  });
}

// POST: submit a new application. Status/applicant are set by the server only.
export async function POST(req) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!user.emailVerified) {
    return NextResponse.json({ error: "Verify your email first" }, { status: 403 });
  }

  let data;
  try {
    data = applicationSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json(
      { error: "Invalid application", issues: e.issues?.map((i) => ({ path: i.path.join("."), message: i.message })) },
      { status: 400 }
    );
  }

  const appsRef = adminDb.collection("tenantApplications");
  const newRef = appsRef.doc();

  try {
    await adminDb.runTransaction(async (tx) => {
      // Prevent duplicate / parallel applications
      const existing = await tx.get(
        appsRef
          .where("applicantUid", "==", user.uid)
          .where("status", "in", ACTIVE_APPLICATION_STATUSES)
          .limit(1)
      );
      if (!existing.empty) throw new Error("DUPLICATE");

      tx.set(newRef, {
        applicantUid: user.uid,
        applicantEmail: user.email,
        organization: data.organization,
        initialCampus: data.campus,
        status: APPLICATION_STATUS.PENDING,
        termsAcceptedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      tx.set(adminDb.collection("platformAuditLogs").doc(), {
        action: "TENANT_APPLICATION_SUBMITTED",
        actorUid: user.uid,
        applicationId: newRef.id,
        createdAt: FieldValue.serverTimestamp(),
      });
    });
  } catch (e) {
    if (e.message === "DUPLICATE") {
      return NextResponse.json({ error: "You already have an application in progress." }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not submit application" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: newRef.id, status: APPLICATION_STATUS.PENDING }, { status: 201 });
}
