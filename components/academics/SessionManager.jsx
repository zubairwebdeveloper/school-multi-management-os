"use client";
import { useState } from "react";
import { ActionForm, ConfirmButton, StatusBadge, card, ghostBtn } from "./shared";
import { addTerm, createSession, deleteTerm, setSessionStatus } from "@/app/(workspace)/[tenantSlug]/dashboard/academic-sessions/actions";

const dateFields = [
  { name: "startDate", label: "Start date", type: "date" },
  { name: "endDate", label: "End date", type: "date" },
];

export default function SessionManager({ slug, sessions, canManage }) {
  const [adding, setAdding] = useState(null); // sessionId currently adding a term

  return (
    <div className="space-y-6">
      {canManage && (
        <section className={card}>
          <h2 className="mb-3 text-base font-semibold">New academic session</h2>
          <ActionForm
            fields={[{ name: "name", label: "Session name", placeholder: "e.g. 2026-2027", wide: true }, ...dateFields]}
            submitLabel="Create session"
            onSubmit={(v) => createSession(slug, v)}
          />
        </section>
      )}

      {sessions.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700">
          No academic sessions yet.
        </div>
      )}

      {sessions.map((s) => (
        <section key={s.id} className={card}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-base font-semibold">{s.name} <StatusBadge status={s.status} /></h2>
              <p className="text-sm text-slate-500">{s.startDate} → {s.endDate}</p>
            </div>
            {canManage && (
              <div className="flex gap-2">
                {s.status === "DRAFT" && (
                  <ConfirmButton confirm={`Activate "${s.name}"?`} run={() => setSessionStatus(slug, s.id, "ACTIVE")}>Activate</ConfirmButton>
                )}
                {s.status === "ACTIVE" && (
                  <ConfirmButton
                    confirm={`Close "${s.name}"? Closed sessions cannot be reopened or edited.`}
                    run={() => setSessionStatus(slug, s.id, "CLOSED")}
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >Close session</ConfirmButton>
                )}
              </div>
            )}
          </div>

          <div className="mt-4">
            <h3 className="text-sm font-medium">Terms</h3>
            {s.terms.length === 0 ? (
              <p className="mt-1 text-sm text-slate-500">No terms added.</p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-100 text-sm dark:divide-slate-800">
                {s.terms.map((t) => (
                  <li key={t.id} className="flex items-center justify-between py-2">
                    <span><span className="font-medium">{t.name}</span> <span className="text-slate-500">· {t.startDate} → {t.endDate}</span></span>
                    {canManage && s.status !== "CLOSED" && (
                      <ConfirmButton confirm={`Remove "${t.name}"?`} run={() => deleteTerm(slug, t.id)}>Remove</ConfirmButton>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {canManage && s.status !== "CLOSED" && (
              adding === s.id ? (
                <div className="mt-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                  <ActionForm
                    fields={[{ name: "name", label: "Term name", placeholder: "e.g. Term 1", wide: true }, ...dateFields]}
                    submitLabel="Add term"
                    onSubmit={(v) => addTerm(slug, s.id, v)}
                    onDone={() => setAdding(null)}
                    onCancel={() => setAdding(null)}
                  />
                </div>
              ) : (
                <button className={`${ghostBtn} mt-3`} onClick={() => setAdding(s.id)}>Add term</button>
              )
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
