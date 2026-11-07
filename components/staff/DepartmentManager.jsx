"use client";
import { useState } from "react";
import { ActionForm, ConfirmButton, StatusBadge, card, ghostBtn } from "@/components/academics/shared";
import { createDepartment, setDepartmentStatus, updateDepartment } from "@/app/(workspace)/[tenantSlug]/dashboard/teachers/actions";

const fields = [{ name: "name", label: "Department name" }, { name: "code", label: "Code (optional)", placeholder: "e.g. SCI" }];

function Row({ slug, d, canManage }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <li className="py-3">
        <ActionForm fields={fields} initial={d} submitLabel="Save" resetOnSuccess={false}
          onSubmit={(v) => updateDepartment(slug, d.id, v)} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />
      </li>
    );
  }
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
      <span><span className="font-medium">{d.name}</span>{d.code && <span className="text-slate-500"> · {d.code}</span>} <span className="text-slate-500">· {d.staffCount} active staff</span>{" "}
        {d.status !== "ACTIVE" && <StatusBadge status={d.status} />}</span>
      {canManage && (
        <span className="flex gap-2">
          {d.status === "ACTIVE" && <button className={ghostBtn} onClick={() => setEditing(true)}>Edit</button>}
          {d.status === "ACTIVE"
            ? <ConfirmButton confirm={`Archive ${d.name}?`} run={() => setDepartmentStatus(slug, d.id, "ARCHIVED")}>Archive</ConfirmButton>
            : <ConfirmButton run={() => setDepartmentStatus(slug, d.id, "ACTIVE")}>Restore</ConfirmButton>}
        </span>
      )}
    </li>
  );
}

export default function DepartmentManager({ slug, departments, canManage }) {
  return (
    <div className="space-y-6">
      {canManage && (
        <section className={card}>
          <h2 className="mb-3 text-base font-semibold">Add department</h2>
          <ActionForm fields={fields} submitLabel="Create department" onSubmit={(v) => createDepartment(slug, v)} />
        </section>
      )}
      {departments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700">No departments yet.</div>
      ) : (
        <ul className={`${card} divide-y divide-slate-100 dark:divide-slate-800`}>{departments.map((d) => <Row key={d.id} slug={slug} d={d} canManage={canManage} />)}</ul>
      )}
    </div>
  );
}
