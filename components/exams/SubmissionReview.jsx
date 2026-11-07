"use client";
import { useState } from "react";
import { ActionForm, ConfirmButton, card, ghostBtn, primaryBtn } from "@/components/academics/shared";
import { returnSubmission, verifySubmission } from "@/app/(workspace)/[tenantSlug]/dashboard/examinations/actions";

export default function SubmissionReview({ slug, examId, sectionId, subjectId, status, canVerify, own }) {
  const [returning, setReturning] = useState(false);
  const slot = { examId, sectionId, subjectId };
  if (!["SUBMITTED", "VERIFIED"].includes(status)) return null;
  return (
    <section className={card}>
      <h2 className="mb-2 text-base font-semibold">Verification</h2>
      <p className="mb-3 text-sm text-slate-500">
        {status === "VERIFIED" ? "These marks are verified." : own ? "You submitted these marks. A different person must verify them." : "Check the marks against the answer sheets, then verify or return them for correction."}
      </p>
      <div className="flex flex-wrap gap-2">
        {status === "SUBMITTED" && canVerify && <ConfirmButton className={primaryBtn} confirm="Verify these marks?" run={() => verifySubmission(slug, slot)}>Verify marks</ConfirmButton>}
        <button className={ghostBtn} onClick={() => setReturning((v) => !v)}>Return for correction</button>
      </div>
      {returning && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
          <ActionForm cols={1} fields={[{ name: "reason", label: "What needs correcting?" }]} submitLabel="Return marks"
            onSubmit={(v) => returnSubmission(slug, { ...slot, reason: v.reason })} onDone={() => setReturning(false)} onCancel={() => setReturning(false)} />
        </div>
      )}
    </section>
  );
}
