"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setCampusStatus } from "@/app/(workspace)/[tenantSlug]/dashboard/campuses/actions";

export default function CampusStatusButton({ slug, campusId, campusName, status }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const next = status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  async function onClick() {
    const verb = next === "INACTIVE" ? "Deactivate" : "Reactivate";
    if (!window.confirm(`${verb} "${campusName}"?`)) return;
    setBusy(true);
    const res = await setCampusStatus(slug, campusId, next);
    setBusy(false);
    if (res.ok) {
      toast.success(next === "INACTIVE" ? "Campus deactivated." : "Campus reactivated.");
      router.refresh();
    } else {
      toast.error(res.error);
    }
  }

  return (
    <button onClick={onClick} disabled={busy}
      className={`rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-60 ${
        next === "INACTIVE" ? "border-red-300 text-red-700 hover:bg-red-50" : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
      }`}>
      {next === "INACTIVE" ? "Deactivate" : "Reactivate"}
    </button>
  );
}
