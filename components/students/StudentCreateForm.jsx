"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GENDERS, RELATIONSHIPS } from "@/lib/validations/students";
import { inputCls, primaryBtn, card } from "@/components/academics/shared";
import EnrollmentPicker from "./EnrollmentPicker";
import { createStudent } from "@/app/(workspace)/[tenantSlug]/dashboard/students/actions";

const lbl = "mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300";

export default function StudentCreateForm({ slug, campuses, classes, sections, defaultCampusId }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [v, setV] = useState({
    firstName: "", lastName: "", gender: "", dateOfBirth: "", address: "", phone: "", previousSchool: "",
    campusId: defaultCampusId || (campuses.length === 1 ? campuses[0].id : ""), classId: "", sectionId: "",
    g_fullName: "", g_relationship: "", g_phone: "", g_email: "",
  });
  const set = (k) => (e) => setV((x) => ({ ...x, [k]: e.target.value }));

  const field = (k, label, extra = {}) => (
    <div className={extra.wide ? "sm:col-span-2" : ""}>
      <label htmlFor={`sc-${k}`} className={lbl}>{label}</label>
      {extra.options ? (
        <select id={`sc-${k}`} className={inputCls} value={v[k]} onChange={set(k)}>
          <option value="" disabled>Select…</option>
          {extra.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : (
        <input id={`sc-${k}`} className={inputCls} type={extra.type || "text"} value={v[k]} onChange={set(k)} autoComplete="off" />
      )}
      {errors[extra.errKey || k] && <p className="mt-1 text-xs text-red-600">{errors[extra.errKey || k][0]}</p>}
    </div>
  );

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const res = await createStudent(slug, {
        firstName: v.firstName, lastName: v.lastName, gender: v.gender, dateOfBirth: v.dateOfBirth,
        address: v.address, phone: v.phone, previousSchool: v.previousSchool,
        campusId: v.campusId, classId: v.classId, sectionId: v.sectionId,
        guardian: { fullName: v.g_fullName, relationship: v.g_relationship, phone: v.g_phone, email: v.g_email },
      });
      if (res.ok) {
        toast.success(res.message);
        router.push(`/${slug}/dashboard/students/${res.id}`);
        router.refresh();
      } else {
        setErrors(res.fieldErrors || {});
        toast.error(res.error);
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <section className={card}>
        <h2 className="mb-3 text-base font-semibold">Student</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {field("firstName", "First name")}
          {field("lastName", "Last name")}
          {field("gender", "Gender", { options: GENDERS })}
          {field("dateOfBirth", "Date of birth", { type: "date" })}
          {field("address", "Address", { wide: true })}
          {field("phone", "Student phone (optional)", { type: "tel" })}
          {field("previousSchool", "Previous school (optional)")}
        </div>
      </section>

      <section className={card}>
        <h2 className="mb-3 text-base font-semibold">Enrollment</h2>
        <EnrollmentPicker campuses={campuses} classes={classes} sections={sections} value={v} errors={errors}
          onChange={(n) => setV((x) => ({ ...x, ...n }))} />
      </section>

      <section className={card}>
        <h2 className="mb-1 text-base font-semibold">Primary guardian</h2>
        <p className="mb-3 text-xs text-slate-500">If a guardian with the same phone number already exists, the student is linked to them (siblings).</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {field("g_fullName", "Full name", { errKey: "guardian.fullName" })}
          {field("g_relationship", "Relationship", { options: RELATIONSHIPS, errKey: "guardian.relationship" })}
          {field("g_phone", "Phone", { type: "tel", errKey: "guardian.phone" })}
          {field("g_email", "Email (optional)", { type: "email", errKey: "guardian.email" })}
        </div>
      </section>

      <div className="flex gap-3">
        <button type="submit" disabled={busy} className={primaryBtn}>{busy ? "Saving…" : "Admit student"}</button>
        <button type="button" onClick={() => router.back()}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">Cancel</button>
      </div>
    </form>
  );
}
