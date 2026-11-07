import Link from "next/link";
import { timingSafeEqual, createHash } from "node:crypto";
import { adminDb } from "@/lib/firebase/admin";
import { getSessionUser } from "@/lib/auth/getSessionUser";
import { roleLabel } from "@/lib/permissions/grant";
import AcceptInvitation from "@/components/team/AcceptInvitation";
import LogoutButton from "@/components/auth/LogoutButton";

// The token is in the URL: never send it to other sites and never index the page.
export const metadata = { title: "Workspace invitation", referrer: "no-referrer", robots: { index: false, follow: false } };

const SLUG = /^[a-z0-9-]{1,60}$/, ID = /^[A-Za-z0-9]{10,40}$/, TOKEN = /^[A-Za-z0-9_-]{30,80}$/;

function Shell({ title, children }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <div className="mt-4 space-y-4 text-sm text-slate-600 dark:text-slate-400">{children}</div>
    </main>
  );
}

export default async function InvitationPage({ searchParams }) {
  const { s: slug = "", i: inviteId = "", k: token = "" } = await searchParams;
  const invalid = (
    <Shell title="Invitation not valid"><p>This invitation link is invalid, has expired, or was already used. Ask your administrator for a new one.</p></Shell>
  );
  if (!SLUG.test(slug) || !ID.test(inviteId) || !TOKEN.test(token)) return invalid;

  const slugSnap = await adminDb.doc(`tenantSlugs/${slug}`).get();
  if (!slugSnap.exists) return invalid;
  const tenantRef = adminDb.doc(`tenants/${slugSnap.data().tenantId}`);
  const [tenant, inv] = await Promise.all([tenantRef.get(), tenantRef.collection("invitations").doc(inviteId).get()]);
  if (!tenant.exists || !inv.exists) return invalid;
  const i = inv.data();

  const a = Buffer.from(i.tokenHash, "hex"), b = Buffer.from(createHash("sha256").update(token).digest("hex"), "hex");
  const expiryMs = i.expiresAt?.toMillis?.() ?? 0;
  const nowMs = new Date().getTime();
  if (i.status !== "PENDING" || expiryMs < nowMs || a.length !== b.length || !timingSafeEqual(a, b)) return invalid;

  // Only after the token is proven valid do we reveal the organization and role.
  const orgName = tenant.data().profile?.name || "this organization";
  const here = `/invitation?s=${encodeURIComponent(slug)}&i=${inviteId}&k=${token}`;
  const next = encodeURIComponent(here);
  const user = await getSessionUser();

  return (
    <Shell title={`Join ${orgName}`}>
      <p>You have been invited as <strong>{roleLabel(i.role)}</strong>.</p>
      {!user && (
        <>
          <p>Sign in with the email address this invitation was sent to. If you do not have an account yet, create one with that address and verify it first.</p>
          <div className="flex gap-3">
            <Link href={`/login?next=${next}`} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">Sign in</Link>
            <Link href="/register" className="rounded-lg border border-slate-300 px-4 py-2 font-medium hover:bg-slate-50 dark:border-slate-700">Create account</Link>
          </div>
          <p className="text-xs text-slate-500">After creating and verifying your account, open this invitation link again.</p>
        </>
      )}
      {user && !user.emailVerified && <p>Please verify your email address first, then open this link again.</p>}
      {user && user.emailVerified && user.email.toLowerCase() !== i.email.toLowerCase() && (
        <>
          <p className="rounded-lg bg-amber-50 p-3 text-amber-800">You are signed in as {user.email}, but this invitation was sent to a different address. Sign out and use the invited account.</p>
          <LogoutButton className="text-blue-600 hover:underline" />
        </>
      )}
      {user && user.emailVerified && user.email.toLowerCase() === i.email.toLowerCase() && (
        <AcceptInvitation slug={slug} inviteId={inviteId} token={token} />
      )}
    </Shell>
  );
}
