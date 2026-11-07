"use client";
import { ActionForm, card } from "@/components/academics/shared";
import { correctMark } from "@/app/(workspace)/[tenantSlug]/dashboard/examinations/results-actions";

export default function CorrectionForm({ slug, examId, students, subjects }) {
  return (
    <section className={card}>
      <h2 className="mb-1 text-base font-semibold">Correct a published mark</h2>
      <p className="mb-3 text-xs text-slate-500">The old and new values, your name and the reason are kept permanently. The student's result and class/section positions are recalculated immediately.</p>
      <ActionForm
        fields={[
          { name: "studentId", label: "Student", options: students.map((s) => ({ value: s.id, label: `${s.name} (${s.adm})` })), wide: true },
          { name: "subjectId", label: "Subject", options: subjects.map((s) => ({ value: s.subjectId, label: `${s.name} (/${s.total})` })) },
          { name: "status", label: "Attendance in paper", options: [{ value: "PRESENT", label: "Present" }, { value: "ABSENT", label: "Absent" }], default: "PRESENT" },
          { name: "obtained", label: "Correct marks (leave blank if absent)" },
          { name: "reason", label: "Reason for correction", wide: true },
        ]}
        submitLabel="Apply correction"
        onSubmit={(v) => correctMark(slug, { ...v, examId })}
      />
    </section>
  );
}
