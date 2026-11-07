"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GENDERS, RELATIONSHIPS } from "@/lib/validations/students";
import { ActionForm, ConfirmButton, card, ghostBtn, primaryBtn } from "@/components/academics/shared";
import EnrollmentPicker from "./EnrollmentPicker";
import {
  addGuardian, changeSection, changeStudentStatus, removeGuardianLink, setPrimaryGuardian, updateStudent,
} from "@/app/(workspace)/[tenantSlug]/dashboard/students/actions";

const detailFields = [
  { name: "firstName", label: "First name" },
  { name: "lastName", label: "Last name" },
  { name: "gender", label: "Gender", options: GENDERS },
  { name: "dateOfBirth", label: "Date of birth", type: "date" },
  { name: "address", label: "Address", wide: true },
  { name: "phone", label: "Student phone (optional)", type: "tel" },
  { name: "previousSchool", label: "Previous school (optional)" },
];

function SectionChanger({ slug, studentId, classes, sections, current }) {
  const router = useRouter();
  const [v, setV] = useState({ classId: current.classId || "", sectionId: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const res = await changeSection(slug, studentId, v);
      if (res.ok) { toast.success(res.message); router.refresh(); }
      else { setErrors(res.fieldErrors || {}); toast.error(res.error); }
    } catch { toast.error("Something went wrong. Please try again."); }
    finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <EnrollmentPicker classes={classes} sections={sections} value={v} onChange={(n) => setV((x) => ({ ...x, ...n }))} errors={errors} />
      <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Move student"}</button>
    </form>
  );
}

export default function StudentActions({ slug, student, guardians, classes, sections, canUpdate }) {
  const [panel, setPanel] = useState(null);
  const toggle = (name) => setPanel((p) => (p === name ? null : name));
  const active = student.status === "ACTIVE";

  return (
    <div className="space-y-6">
      <section className={card}>
        <h2 className="mb-3 text-base font-semibold">Guardians</h2>
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {guardians.map((g) => (
            <li key={g.linkId} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
              <span>
                <span className="font-medium">{g.fullName}</span>
                <span className="text-slate-500"> · {RELATIONSHIPS.find((r) => r.value === g.relationship)?.label || g.relationship} · {g.phone}{g.email ? ` · ${g.email}` : ""}</span>
                {g.isPrimary && <span className="ml-2 rounded-full bg-[#D6B36A]/20 px-2 py-0.5 text-xs font-medium text-[#8a6d2b]">Primary</span>}
              </span>
              {canUpdate && (
                <span className="flex gap-2">
                  {!g.isPrimary && <ConfirmButton run={() => setPrimaryGuardian(slug, student.id, g.linkId)}>Make primary</ConfirmButton>}
                  {!g.isPrimary && guardians.length > 1 && (
                    <ConfirmButton confirm={`Unlink ${g.fullName} from this student?`} run={() => removeGuardianLink(slug, student.id, g.linkId)}>Unlink</ConfirmButton>
                  )}
                </span>
              )}
            </li>
          ))}
        </ul>
        {canUpdate && (
          <div className="mt-3">
            <button className={ghostBtn} onClick={() => toggle("guardian")}>Add guardian</button>
            {panel === "guardian" && (
              <div className="mt-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                <ActionForm
                  fields={[
                    { name: "fullName", label: "Full name" },
                    { name: "relationship", label: "Relationship", options: RELATIONSHIPS },
                    { name: "phone", label: "Phone", type: "tel" },
                    { name: "email", label: "Email (optional)", type: "email" },
                  ]}
                  submitLabel="Add guardian"
                  onSubmit={(v) => addGuardian(slug, student.id, v)}
                  onDone={() => setPanel(null)}
                  onCancel={() => setPanel(null)}
                />
              </div>
            )}
          </div>
        )}
      </section>

      {canUpdate && (
        <section className={card}>
          <h2 className="mb-3 text-base font-semibold">Manage</h2>
          <div className="flex flex-wrap gap-2">
            <button className={ghostBtn} onClick={() => toggle("edit")}>Edit details</button>
            {active && <button className={ghostBtn} onClick={() => toggle("section")}>Change section</button>}
            {active && <button className={ghostBtn} onClick={() => toggle("status")}>Withdraw / graduate</button>}
          </div>

          {panel === "edit" && (
            <div className="mt-4">
              <ActionForm fields={detailFields} initial={student} submitLabel="Save changes" resetOnSuccess={false}
                onSubmit={(v) => updateStudent(slug, student.id, v)} onDone={() => setPanel(null)} onCancel={() => setPanel(null)} />
            </div>
          )}
          {panel === "section" && active && (
            <div className="mt-4">
              <SectionChanger slug={slug} studentId={student.id} classes={classes} sections={sections} current={student} />
            </div>
          )}
          {panel === "status" && active && (
            <div className="mt-4">
              <p className="mb-3 text-xs text-slate-500">The student record, enrollment history and fees stay on file. This cannot be undone from this screen.</p>
              <ActionForm
                fields={[
                  { name: "status", label: "New status", options: [{ value: "WITHDRAWN", label: "Withdrawn" }, { value: "GRADUATED", label: "Graduated" }] },
                  { name: "reason", label: "Reason", wide: true },
                ]}
                submitLabel="Confirm"
                onSubmit={(v) => changeStudentStatus(slug, student.id, v)}
                onDone={() => setPanel(null)}
                onCancel={() => setPanel(null)}
              />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
