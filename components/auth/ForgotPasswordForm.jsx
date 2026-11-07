"use client";
import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { sendPasswordResetEmail } from "firebase/auth";
import { toast } from "sonner";
import { auth } from "@/lib/firebase/client";
import { forgotSchema } from "@/lib/validations/auth";
import { btnCls, errCls, inputCls, labelCls } from "./authUi";

export default function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(forgotSchema),
  });

  async function onSubmit({ email }) {
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch {
      /* do not reveal whether the email exists */
    }
    setSent(true);
    setBusy(false);
    toast.success("If that email is registered, a reset link has been sent.");
  }

  if (sent) {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-400">
        If that email is registered, you will receive a reset link shortly.{" "}
        <Link href="/login" className="text-blue-600 hover:underline">Back to sign in</Link>
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div>
        <label htmlFor="email" className={labelCls}>Email</label>
        <input id="email" type="email" autoComplete="email" className={inputCls} {...register("email")} />
        {errors.email && <p className={errCls}>{errors.email.message}</p>}
      </div>
      <button type="submit" disabled={busy} className={btnCls}>{busy ? "Sending…" : "Send reset link"}</button>
    </form>
  );
}
