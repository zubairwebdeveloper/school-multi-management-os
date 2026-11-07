"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, sendEmailVerification, signOut } from "firebase/auth";
import { toast } from "sonner";
import { auth } from "@/lib/firebase/client";
import { btnCls } from "./authUi";

export default function VerifyEmailPanel() {
  const router = useRouter();
  const [user, setUser] = useState(undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => onAuthStateChanged(auth, (u) => setUser(u)), []);

  async function resend() {
    setBusy(true);
    try {
      await sendEmailVerification(auth.currentUser);
      toast.success("Verification email sent.");
    } catch {
      toast.error("Please wait a moment before requesting another email.");
    } finally {
      setBusy(false);
    }
  }

  async function continueSignIn() {
    await auth.currentUser?.reload();
    if (auth.currentUser?.emailVerified) {
      await signOut(auth); // force a fresh login so a session is minted with a verified token
      toast.success("Email verified. Please sign in.");
      router.push("/login");
    } else {
      toast.error("Email not verified yet.");
    }
  }

  if (user === undefined) return <p className="text-sm">Loading…</p>;
  if (!user) {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Please <Link href="/login" className="text-blue-600 hover:underline">sign in</Link> to continue.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        We sent a verification link to <strong>{user.email}</strong>. Open it, then come back here.
      </p>
      <button onClick={continueSignIn} className={btnCls}>I have verified my email</button>
      <button onClick={resend} disabled={busy}
        className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
        Resend email
      </button>
    </div>
  );
}
