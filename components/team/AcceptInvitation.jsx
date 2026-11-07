"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { acceptInvitation } from "@/app/(auth)/invitation/actions";

export default function AcceptInvitation({ slug, inviteId, token }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function accept() {
    setBusy(true);
    try {
      const res = await acceptInvitation(slug, inviteId, token);
      if (res.ok) { toast.success("Welcome aboard."); router.replace(`/${res.slug}/dashboard`); router.refresh(); }
      else toast.error(res.error);
    } catch { toast.error("Something went wrong. Please try again."); }
    finally { setBusy(false); }
  }
  return (
    <button onClick={accept} disabled={busy}
      className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
      {busy ? "Joining…" : "Accept invitation"}
    </button>
  );
}
