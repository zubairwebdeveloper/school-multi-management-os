// One-time: grant SUPER_ADMIN to an existing Firebase user.
// Usage: node --env-file=.env.local scripts/bootstrap-admin.js you@example.com
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node --env-file=.env.local scripts/bootstrap-admin.js <email>");
  process.exit(1);
}

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});

const user = await getAuth(app).getUserByEmail(email);
if (!user.emailVerified) {
  console.error("That user has not verified their email. Verify first.");
  process.exit(1);
}

await getFirestore(app).doc(`platformAdmins/${user.uid}`).set({
  email: user.email,
  role: "SUPER_ADMIN",
  status: "ACTIVE",
  createdAt: FieldValue.serverTimestamp(),
});
console.log(`SUPER_ADMIN granted to ${user.email}`);
process.exit(0);
