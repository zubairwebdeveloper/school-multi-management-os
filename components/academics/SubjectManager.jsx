"use client";
import { useState } from "react";
import { CURRICULA } from "@/lib/onboarding/constants";
import { SUBJECT_CATEGORIES } from "@/lib/validations/academics";
import { ActionForm, ConfirmButton, StatusBadge, card, ghostBtn } from "./shared";
import { createSubject, setSubjectStatus, updateSubject } from "@/app/(workspace)/[tenantSlug]/dashboard/subjects/actions";

const curricula = [{ value: "ALL", label: "All curricula" }, ...CURRICULA];
const label = (list, v) => list.find((x) => x.value === v)?.label || v;
const fields = [
  { name: "name", label: "Subject name", wide: true },
  { name: "code", label: "Code (optional)", placeholder: "e.g. MATH" },
  { name: "category", label: "Category", options: SUBJECT_CATEGORIES, default: "CORE" },
  { name: "curriculum", label: "Curriculum", options: curricula, default: "ALL", wide: true },
];

function Row({ slug, s, canManage }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <li className="py-3">
        <ActionForm fields={fields} initial={s} submitLabel="Save" resetOnSuccess={false}
          onSubmit={(v) => updateSubject(slug, s.id, v)} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />
      </li>
    );
  }
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
      <span>
        <span className="font-medium">{s.name}</span>
        {s.code && <span className="text-slate-500"> · {s.code}</span>}
        <span className="text-slate-500"> · {label(SUBJECT_CATEGORIES, s.category)} · {label(curricula, s.curriculum)}</span>{" "}
        {s.status !== "ACTIVE" && <StatusBadge status={s.status} />}
      </span>
      {canManage && (
        <span className="flex gap-2">
          {s.status === "ACTIVE" && <button className={ghostBtn} onClick={() => setEditing(true)}>Edit</button>}
          {s.status === "ACTIVE" ? (
            <ConfirmButton confirm={`Archive ${s.name}?`} run={() => setSubjectStatus(slug, s.id, "ARCHIVED")}>Archive</ConfirmButton>
          ) : (
            <ConfirmButton run={() => setSubjectStatus(slug, s.id, "ACTIVE")}>Restore</ConfirmButton>
          )}
        </span>
      )}
    </li>
  );
}

export default function SubjectManager({ slug, subjects, canManage }) {
  return (
    <div className="space-y-6">
      {canManage && (
        <section className={card}>
          <h2 className="mb-3 text-base font-semibold">Add subject</h2>
          <ActionForm fields={fields} submitLabel="Create subject" onSubmit={(v) => createSubject(slug, v)} />
        </section>
      )}
      {subjects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700">No subjects yet.</div>
      ) : (
        <ul className={`${card} divide-y divide-slate-100 dark:divide-slate-800`}>
          {subjects.map((s) => <Row key={s.id} slug={slug} s={s} canManage={canManage} />)}
        </ul>
      )}
    </div>
  );
}
