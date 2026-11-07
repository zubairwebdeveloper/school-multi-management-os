"use client";
import { useState } from "react";
import { ActionForm, card } from "@/components/academics/shared";
import { FREQUENCIES } from "@/lib/validations/fees";
import { generateInvoices } from "@/app/(workspace)/[tenantSlug]/dashboard/fees/actions";

export default function GenerateForm({ slug, classes, sections, defaultMonth }) {
  const [classId, setClassId] = useState("");
  return (
    <section className={card}>
      <h2 className="mb-1 text-base font-semibold">Generate invoices</h2>
      <p className="mb-4 text-xs text-slate-500">Uses the class fee structure and each student's active concessions. Running it again for the same period never double-bills: existing invoices are skipped.</p>
      <ActionForm
        key={classId}
        fields={[
          { name: "classId", label: "Class", options: classes.map((c) => ({ value: c.id, label: c.label })) },
          { name: "sectionId", label: "Section (optional)", options: [{ value: "", label: "All sections" }, ...sections.filter((s) => s.classId === classId).map((s) => ({ value: s.id, label: s.name }))], default: "" },
          { name: "frequency", label: "Fee type", options: FREQUENCIES, default: "MONTHLY" },
          { name: "periodKey", label: "Period", placeholder: "e.g. 2026-11", default: defaultMonth },
          { name: "dueDate", label: "Due date", type: "date" },
        ]}
        initial={{ classId }}
        submitLabel="Generate invoices"
        resetOnSuccess={false}
        onSubmit={(v) => { setClassId(v.classId); return generateInvoices(slug, v); }}
      />
      <div className="mt-3">
        <label htmlFor="gen-class-hint" className="sr-only">Choose class to load its sections</label>
        <select id="gen-class-hint" className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-900" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">Load sections for a class…</option>
          {classes.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>
    </section>
  );
}
