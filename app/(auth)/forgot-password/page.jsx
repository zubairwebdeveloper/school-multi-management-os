import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata = { title: "Reset your password" };

export default function Page() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight">Reset your password</h1>
      <p className="mb-6 mt-1 text-sm text-slate-600 dark:text-slate-400">Enter your email and we will send a reset link.</p>
      <ForgotPasswordForm />
    </main>
  );
}
