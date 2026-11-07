"use client";
import { ActionForm, ConfirmButton, card } from "@/components/academics/shared";
import { createSubstitution, removeSubstitution } from "@/app/(workspace)/[tenantSlug]/dashboard/timetables/actions";

export default function SubstitutionPanel({ slug, sections, periods, teachers, upcoming, canManage }) {
  return (
    <div className="space-y-6">
      {canManage && (
        <section className={card}>
          <h2 className="mb-3 text-base font-semibold">Assign a substitute</h2>
          <ActionForm
            fields={[
              { name: "date", label: "Date", type: "date" },
              { name: "sectionId", label: "Class & section", options: sections.map((s) => ({ value: s.id, label: s.label })) },
              { name: "periodId", label: "Period", options: periods.filter((p) => !p.isBreak).map((p) => ({ value: p.id, label: `${p.name} (${p.start}–${p.end})` })) },
              { name: "substituteEmployeeId", label: "Substitute teacher", options: teachers.map((t) => ({ value: t.id, label: t.name })) },
              { name: "reason", label: "Reason", wide: true },
            ]}
            submitLabel="Assign substitute"
            onSubmit={(v) => createSubstitution(slug, v)}
          />
        </section>
      )}
      <section className={card}>
        <h2 className="mb-2 text-base font-semibold">Upcoming substitutions</h2>
        {upcoming.length === 0 ? <p className="text-sm text-slate-500">None scheduled.</p> : (
          <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {upcoming.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span><span className="font-medium">{u.date}</span> · {u.period} · {u.section}<br />
                  <span className="text-slate-500">{u.original} → <strong>{u.substitute}</strong> · {u.reason}</span></span>
                {canManage && <ConfirmButton confirm="Remove this substitution?" run={() => removeSubstitution(slug, u.id)}>Remove</ConfirmButton>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
