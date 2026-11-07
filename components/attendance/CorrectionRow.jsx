"use client";
import { useState } from "react";
import { ActionForm, ConfirmButton, ghostBtn } from "@/components/academics/shared";
import { reviewCorrection } from "@/app/(workspace)/[tenantSlug]/dashboard/attendance/actions";

export default function CorrectionRow({ slug, c, canReview }) {
  const [rejecting, setRejecting] = useState(false);
  return (
    <li className="rounded-xl border border-slate-200 bg-white p-4 text-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p className="font-medium">{c.studentName} <span className="font-mono text-xs text-slate-500">{c.admissionNumber}</span></p>
          <p className="text-slate-500">{c.sectionLabel} · {c.date}</p>
          <p>{c.fromLabel} → <strong>{c.toLabel}</strong></p>
          <p className="text-slate-600 dark:text-slate-300">Reason: {c.reason}</p>
        </div>
        {canReview ? (
          <div className="flex gap-2">
            <ConfirmButton confirm="Approve and apply this correction?" run={() => reviewCorrection(slug, c.id, { decision: "APPROVED", note: "" })}>Approve</ConfirmButton>
            <button className={ghostBtn} onClick={() => setRejecting((v) => !v)}>Reject</button>
          </div>
        ) : <span className="text-xs text-slate-500">Your own request</span>}
      </div>
      {rejecting && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
          <ActionForm fields={[{ name: "note", label: "Reason for rejecting", wide: true }]} cols={1} submitLabel="Confirm rejection"
            onSubmit={(v) => reviewCorrection(slug, c.id, { decision: "REJECTED", note: v.note })}
            onDone={() => setRejecting(false)} onCancel={() => setRejecting(false)} />
        </div>
      )}
    </li>
  );
}
