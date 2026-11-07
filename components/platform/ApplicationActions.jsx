"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function ApplicationActions({ applicationId, organizationName }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  async function call(action, body) {
    setBusy(true);
    try {
      const res = await fetch(`/api/platform/applications/${applicationId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Action failed");
        return;
      }
      toast.success(action === "approve" ? "Application approved. Workspace created." : "Application rejected.");
      setRejecting(false);
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setBusy(false);
    }
  }

  function approve() {
    if (window.confirm(`Approve "${organizationName}" and create its workspace?`)) call("approve");
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button onClick={approve} disabled={busy}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
          Approve
        </button>
        <button onClick={() => setRejecting((v) => !v)} disabled={busy}
          className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60">
          Reject
        </button>
      </div>
      {rejecting && (
        <div className="space-y-2">
          <label htmlFor={`reason-${applicationId}`} className="block text-xs font-medium">Reason (shown to the applicant)</label>
          <textarea id={`reason-${applicationId}`} value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500}
            className="w-full rounded-lg border border-slate-300 p-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
          <button onClick={() => call("reject", { reason })} disabled={busy || reason.trim().length < 5}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
            Confirm rejection
          </button>
        </div>
      )}
    </div>
  );
}
