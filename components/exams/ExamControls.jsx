"use client";
import { ConfirmButton, card, primaryBtn } from "@/components/academics/shared";
import { lockExam, openExam, reopenExam } from "@/app/(workspace)/[tenantSlug]/dashboard/examinations/actions";
import { publishExam } from "@/app/(workspace)/[tenantSlug]/dashboard/examinations/results-actions";

export default function ExamControls({ slug, examId, status, canManage, canApprove }) {
  if (!canManage && !(canApprove && status === "LOCKED")) return null;
  return (
    <section className={card}>
      <h2 className="mb-2 text-base font-semibold">Exam stage</h2>
      {status === "DRAFT" && canManage && (<><p className="mb-3 text-sm text-slate-500">Finish the subject list, then open marks entry. Subjects can no longer be changed once it is open.</p>
        <ConfirmButton className={primaryBtn} confirm="Open marks entry? Subjects and totals will be frozen." run={() => openExam(slug, examId)}>Open marks entry</ConfirmButton></>)}
      {status === "OPEN" && canManage && (<><p className="mb-3 text-sm text-slate-500">Lock marks when every subject in every section is verified. Locking checks that no student is missing marks.</p>
        <ConfirmButton className={primaryBtn} confirm="Lock all marks for this exam?" run={() => lockExam(slug, examId)}>Lock marks</ConfirmButton></>)}
      {status === "LOCKED" && (
        <>
          <p className="mb-3 text-sm text-slate-500">Marks are locked. Publishing calculates every result and position and makes them visible to parents. Later changes are only possible as recorded corrections.</p>
          <div className="flex flex-wrap gap-2">
            {canApprove && <ConfirmButton className={primaryBtn} confirm="Approve and publish these results? Parents will be able to see them." run={() => publishExam(slug, examId)}>Approve &amp; publish results</ConfirmButton>}
            {canManage && <ConfirmButton confirm="Reopen marks entry?" run={() => reopenExam(slug, examId)}>Reopen marks entry</ConfirmButton>}
          </div>
        </>
      )}
      {status === "PUBLISHED" && <p className="text-sm text-slate-500">Results are published. Use the correction form below if a mark was wrong.</p>}
    </section>
  );
}
