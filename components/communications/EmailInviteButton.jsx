"use client";
import { useState } from "react";
import { toast } from "sonner";
import { ghostBtn } from "@/components/academics/shared";
import { emailInvitation } from "@/lib/communications/invite-email-actions";

/** `path` is the invitation path returned when the link was created; it carries the token the server re-verifies. */
export default function EmailInviteButton({ slug, path, email }) {
  const [busy, setBusy] = useState(false);
  async function send() {
    const u = new URL(path, "http://local");
    setBusy(true);
    try {
      const res = await emailInvitation(slug, { inviteId: u.searchParams.get("i") || "", token: u.searchParams.get("k") || "" });
      if (res.ok) toast.success(res.message); else toast.error(res.error);
    } catch { toast.error("Something went wrong. Please try again."); }
    finally { setBusy(false); }
  }
  return <button type="button" className={ghostBtn} disabled={busy} onClick={send}>{busy ? "Sending…" : `Email this link to ${email}`}</button>;
}
