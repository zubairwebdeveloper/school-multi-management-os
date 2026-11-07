"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ghostBtn } from "@/components/academics/shared";
import { markAllRead, setEmailPreference } from "@/lib/notifications/actions";

export default function InboxControls({ slug, hasUnread, emailEnabled }) {
  const router = useRouter();
  const [email, setEmail] = useState(emailEnabled);
  const [busy, setBusy] = useState(false);
  async function run(fn) {
    setBusy(true);
    try { const r = await fn(); r.ok ? toast.success(r.message) : toast.error(r.error); router.refresh(); }
    catch { toast.error("Something went wrong. Please try again."); }
    finally { setBusy(false); }
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <button className={ghostBtn} disabled={busy || !hasUnread} onClick={() => run(() => markAllRead(slug))}>Mark all as read</button>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={email} disabled={busy} onChange={(e) => { setEmail(e.target.checked); run(() => setEmailPreference(slug, e.target.checked)); }} />
        Email me announcements
      </label>
    </div>
  );
}
