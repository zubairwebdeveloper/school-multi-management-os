"use client";
import { useState } from "react";
import { ActionForm, card, ghostBtn } from "@/components/academics/shared";
import { employeeFields } from "./EmployeeForm";
import { setEmployeeStatus, updateEmployee } from "@/app/(workspace)/[tenantSlug]/dashboard/teachers/actions";

export default function EmployeeActions({ slug, employee, departments, canManage }) {
  const [panel, setPanel] = useState(null);
  if (!canManage) return null;
  const toggle = (n) => setPanel((p) => (p === n ? null : n));
  const active = employee.status === "ACTIVE";

  return (
    <section className={card}>
      <h2 className="mb-3 text-base font-semibold">Manage</h2>
      <div className="flex flex-wrap gap-2">
        <button className={ghostBtn} onClick={() => toggle("edit")}>Edit details</button>
        <button className={ghostBtn} onClick={() => toggle("status")}>{active ? "Deactivate" : "Reactivate"}</button>
      </div>
      {panel === "edit" && (
        <div className="mt-4">
          <ActionForm fields={employeeFields(departments, null)} initial={employee} submitLabel="Save changes" resetOnSuccess={false}
            onSubmit={(v) => updateEmployee(slug, employee.id, v)} onDone={() => setPanel(null)} onCancel={() => setPanel(null)} />
        </div>
      )}
      {panel === "status" && (
        <div className="mt-4">
          {active && <p className="mb-3 text-xs text-slate-500">Deactivating releases this person's subject assignments and class-teacher role. The record stays on file.</p>}
          <ActionForm fields={[{ name: "reason", label: "Reason", wide: true }]} cols={1}
            submitLabel={active ? "Deactivate" : "Reactivate"}
            onSubmit={(v) => setEmployeeStatus(slug, employee.id, { status: active ? "INACTIVE" : "ACTIVE", reason: v.reason })}
            onDone={() => setPanel(null)} onCancel={() => setPanel(null)} />
        </div>
      )}
    </section>
  );
}
