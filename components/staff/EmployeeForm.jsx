"use client";
import { useRouter } from "next/navigation";
import { GENDERS } from "@/lib/validations/students";
import { STAFF_TYPES } from "@/lib/validations/staff";
import { ActionForm, card } from "@/components/academics/shared";
import { createEmployee } from "@/app/(workspace)/[tenantSlug]/dashboard/teachers/actions";

export function employeeFields(departments, campuses) {
  return [
    ...(campuses ? [{ name: "campusId", label: "Campus", options: campuses.map((c) => ({ value: c.id, label: c.name })), wide: true }] : []),
    { name: "firstName", label: "First name" },
    { name: "lastName", label: "Last name" },
    { name: "gender", label: "Gender", options: GENDERS },
    { name: "phone", label: "Phone", type: "tel" },
    { name: "email", label: "Email (optional)", type: "email" },
    { name: "joinDate", label: "Joining date", type: "date" },
    { name: "staffType", label: "Staff type", options: STAFF_TYPES, default: "TEACHING" },
    { name: "designation", label: "Designation", placeholder: "e.g. Senior Teacher" },
    { name: "departmentId", label: "Department (optional)", options: [{ value: "", label: "None" }, ...departments.map((d) => ({ value: d.id, label: d.name }))], default: "" },
    { name: "qualification", label: "Qualification (optional)", wide: true },
    { name: "address", label: "Address", wide: true },
  ];
}

export default function EmployeeForm({ slug, campuses, departments, defaultCampusId }) {
  const router = useRouter();
  return (
    <section className={card}>
      <ActionForm
        fields={employeeFields(departments, campuses)}
        initial={{ campusId: defaultCampusId || (campuses.length === 1 ? campuses[0].id : "") }}
        submitLabel="Add staff member"
        onSubmit={(v) => createEmployee(slug, v)}
        onDone={(res) => router.push(`/${slug}/dashboard/teachers/${res.id}`)}
      />
    </section>
  );
}
