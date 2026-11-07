"use client";
import { ActionForm, card } from "@/components/academics/shared";
import { ATTENDANCE_STATUSES } from "@/lib/validations/attendance";
import { requestCorrection } from "@/app/(workspace)/[tenantSlug]/dashboard/attendance/actions";

export default function CorrectionRequestForm({ slug, sectionId, date, students }) {
  return (
    <section className={card}>
      <h2 className="text-base font-semibold">Request a correction</h2>
      <p className="mb-3 mt-1 text-xs text-slate-500">This date has passed, so changes need approval from an authorized reviewer.</p>
      <ActionForm
        fields={[
          { name: "studentId", label: "Student", options: students.map((s) => ({ value: s.id, label: `${s.name} (${s.admissionNumber})` })), wide: true },
          { name: "status", label: "Correct status", options: ATTENDANCE_STATUSES.map((s) => ({ value: s.value, label: s.label })) },
          { name: "reason", label: "Reason" },
        ]}
        submitLabel="Send for approval"
        onSubmit={(v) => requestCorrection(slug, { ...v, sectionId, date })}
      />
    </section>
  );
}
