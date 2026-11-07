import RegisterForm from "@/components/auth/RegisterForm";

export const metadata = { title: "Create your account" };

export default function Page() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
      <p className="mb-6 mt-1 text-sm text-slate-600 dark:text-slate-400">Start by creating a secure account for your school.</p>
      <RegisterForm />
    </main>
  );
}
