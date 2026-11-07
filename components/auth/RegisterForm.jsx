"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from "firebase/auth";
import { toast } from "sonner";
import { auth } from "@/lib/firebase/client";
import { registerSchema } from "@/lib/validations/auth";
import { btnCls, errCls, friendlyAuthError, inputCls, labelCls } from "./authUi";

// Registration only creates a plain Firebase user. No role/tenant is assigned
// here; ownership is granted server-side after platform approval (Phase 3).
export default function RegisterForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit({ fullName, email, password }) {
    setBusy(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: fullName });
      await sendEmailVerification(cred.user);
      toast.success("Account created. Check your email to verify.");
      router.push("/verify-email");
    } catch (e) {
      toast.error(friendlyAuthError(e.code));
    } finally {
      setBusy(false);
    }
  }

  const field = (id, label, type, auto) => (
    <div>
      <label htmlFor={id} className={labelCls}>{label}</label>
      <input id={id} type={type} autoComplete={auto} className={inputCls} {...register(id)} />
      {errors[id] && <p className={errCls}>{errors[id].message}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {field("fullName", "Full name", "text", "name")}
      {field("email", "Email", "email", "email")}
      {field("password", "Password", "password", "new-password")}
      {field("confirmPassword", "Confirm password", "password", "new-password")}
      <button type="submit" disabled={busy} className={btnCls}>{busy ? "Creating…" : "Create account"}</button>
      <p className="text-center text-sm text-slate-600 dark:text-slate-400">
        Already registered? <Link href="/login" className="text-blue-600 hover:underline">Sign in</Link>
      </p>
    </form>
  );
}
