"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GoogleAuthProvider, signInWithEmailAndPassword, signInWithPopup, signOut } from "firebase/auth";
import { toast } from "sonner";
import { auth } from "@/lib/firebase/client";
import { loginSchema } from "@/lib/validations/auth";
import { safeRedirect } from "@/lib/auth/safeRedirect";
import { btnCls, errCls, friendlyAuthError, inputCls, labelCls } from "./authUi";

async function createSession(user) {
  const idToken = await user.getIdToken(true);
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  return { res, data: await res.json().catch(() => ({})) };
}

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  async function finish(user) {
    const { res, data } = await createSession(user);
    if (res.ok) {
      router.replace(safeRedirect(params.get("next")));
      router.refresh();
      return;
    }
    await signOut(auth);
    if (data.code === "EMAIL_NOT_VERIFIED") {
      toast.error("Please verify your email first.");
      router.push("/verify-email");
      return;
    }
    toast.error(data.error || "Could not sign in.");
  }

  async function onSubmit({ email, password }) {
    setBusy(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      if (!cred.user.emailVerified) {
        // keep signed in client-side so verify-email page can resend
        toast.error("Please verify your email first.");
        router.push("/verify-email");
        return;
      }
      await finish(cred.user);
    } catch (e) {
      toast.error(friendlyAuthError(e.code));
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    setBusy(true);
    try {
      const cred = await signInWithPopup(auth, new GoogleAuthProvider());
      await finish(cred.user);
    } catch (e) {
      toast.error(friendlyAuthError(e.code));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <label htmlFor="email" className={labelCls}>Email</label>
        <input id="email" type="email" autoComplete="email" className={inputCls} {...register("email")} />
        {errors.email && <p className={errCls}>{errors.email.message}</p>}
      </div>
      <div>
        <label htmlFor="password" className={labelCls}>Password</label>
        <input id="password" type="password" autoComplete="current-password" className={inputCls} {...register("password")} />
        {errors.password && <p className={errCls}>{errors.password.message}</p>}
      </div>
      <div className="text-right text-sm">
        <Link href="/forgot-password" className="text-blue-600 hover:underline">Forgot password?</Link>
      </div>
      <button type="submit" disabled={busy} className={btnCls}>{busy ? "Signing in…" : "Sign in"}</button>
      <button type="button" disabled={busy} onClick={onGoogle}
        className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
        Continue with Google
      </button>
      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        New organization? <Link href="/register" className="text-blue-600 hover:underline">Create an account</Link>
      </p>
    </form>
  );
}
