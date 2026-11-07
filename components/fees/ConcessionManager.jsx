"use client";
import { ActionForm, ConfirmButton, card } from "@/components/academics/shared";
import { createConcession, endConcession } from "@/app/(workspace)/[tenantSlug]/dashboard/fees/actions";

export default function ConcessionManager({ slug, studentId, concessions, canManage }) {
  return (
    <section className={card}>
      <h2 className="mb-1 text-base font-semibold">Concessions &amp; scholarships</h2>
      <p className="mb-3 text-xs text-slate-500">Applied when invoices are generated. They do not change invoices that already exist.</p>
      {concessions.length === 0 ? <p className="text-sm text-slate-500">None.</p> : (
        <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
          {concessions.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span><span className="font-medium">{c.valueText}</span> · {c.reason} {c.status !== "ACTIVE" && <span className="text-xs text-slate-500">(ended)</span>}</span>
              {canManage && c.status === "ACTIVE" && <ConfirmButton confirm="End this concession?" run={() => endConcession(slug, c.id)}>End</ConfirmButton>}
            </li>
          ))}
        </ul>
      )}
      {canManage && (
        <div className="mt-4">
          <ActionForm
            fields={[
              { name: "type", label: "Type", options: [{ value: "FIXED", label: "Fixed amount" }, { value: "PERCENT", label: "Percent of invoice" }], default: "PERCENT" },
              { name: "value", label: "Value (amount or whole percent)" },
              { name: "reason", label: "Reason", wide: true },
            ]}
            submitLabel="Add concession"
            onSubmit={(v) => createConcession(slug, { ...v, studentId })}
          />
        </div>
      )}
    </section>
  );
}
