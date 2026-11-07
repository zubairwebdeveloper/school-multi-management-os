import { z } from "zod";

export const GENDERS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
];

export const RELATIONSHIPS = [
  { value: "FATHER", label: "Father" },
  { value: "MOTHER", label: "Mother" },
  { value: "GUARDIAN", label: "Guardian" },
  { value: "GRANDPARENT", label: "Grandparent" },
  { value: "OTHER", label: "Other" },
];

export const normalizePhone = (p) => String(p || "").replace(/[^\d+]/g, "");

const phoneRe = /^[+0-9()\-\s]{7,20}$/;
const optional = (max) => z.string().trim().max(max).optional().or(z.literal("")).transform((v) => v || "");

const dateOfBirth = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date")
  .refine((v) => {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return false;
    const years = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
    return years >= 2 && years <= 30;
  }, "Enter a valid date of birth (age 2 to 30)");

export const studentDetailsSchema = z.object({
  firstName: z.string().trim().min(1, "Enter the first name").max(50),
  lastName: z.string().trim().min(1, "Enter the last name").max(50),
  gender: z.enum(GENDERS.map((g) => g.value), { errorMap: () => ({ message: "Select a gender" }) }),
  dateOfBirth,
  address: z.string().trim().min(5, "Enter the address").max(250),
  phone: z.string().trim().regex(phoneRe, "Enter a valid phone number").or(z.literal("")).transform((v) => v || ""),
  previousSchool: optional(120),
});

export const guardianSchema = z.object({
  fullName: z.string().trim().min(3, "Enter the guardian's full name").max(100),
  relationship: z.enum(RELATIONSHIPS.map((r) => r.value), { errorMap: () => ({ message: "Select a relationship" }) }),
  phone: z.string().trim().regex(phoneRe, "Enter a valid phone number"),
  email: z.string().trim().email("Enter a valid email").max(120).or(z.literal("")).transform((v) => v || ""),
});

export const createStudentSchema = studentDetailsSchema.extend({
  campusId: z.string().min(1, "Select a campus"),
  classId: z.string().min(1, "Select a class"),
  sectionId: z.string().min(1, "Select a section"),
  guardian: guardianSchema,
});

export const changeSectionSchema = z.object({
  classId: z.string().min(1, "Select a class"),
  sectionId: z.string().min(1, "Select a section"),
});

export const statusChangeSchema = z.object({
  status: z.enum(["WITHDRAWN", "GRADUATED"], { errorMap: () => ({ message: "Select a status" }) }),
  reason: z.string().trim().min(3, "Give a short reason").max(300),
});

/** Like parseInput but supports nested objects: errors keyed "guardian.fullName". */
export function parseNested(schema, input) {
  const r = schema.safeParse(input);
  if (r.success) return { data: r.data };
  const fieldErrors = {};
  for (const i of r.error.issues) (fieldErrors[i.path.join(".")] ||= []).push(i.message);
  return { error: { ok: false, error: "Please fix the highlighted fields.", fieldErrors } };
}
