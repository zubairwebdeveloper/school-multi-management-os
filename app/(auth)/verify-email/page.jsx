import VerifyEmailPanel from "@/components/auth/VerifyEmailPanel";

export const metadata = { title: "Verify your email" };

export default function Page() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight">Verify your email</h1>
      <p className="mb-6 mt-1 text-sm text-slate-600 dark:text-slate-400">One more step before you can continue.</p>
      <VerifyEmailPanel />
    </main>
  );
}
