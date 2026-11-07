import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";

export const metadata = { title: "Sign in" };

export default function Page() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
      <p className="mb-6 mt-1 text-sm text-slate-600 dark:text-slate-400">Welcome back to School Multi Management OS.</p>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
