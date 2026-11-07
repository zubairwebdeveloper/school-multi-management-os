import { z } from "zod";
import { isValidDate } from "@/lib/utils/dates";
import { GENDERS } from "@/lib/validations/students";

export const STAFF_TYPES = [
  { value: "TEACHING", label: "Teaching staff" },
  { value: "NON_TEACHING", label: "Non-teaching staff" },
];

const optional = (max) => z.string().trim().max(max).optional().or(z.literal("")).transform((v) => v || "");

export const departmentSchema = z.object({
  name: z.string().trim().min(2, "Enter the department name").max(80),
  code: z.string().trim().toUpperCase().regex(/^([A-Z0-9-]{2,10})?$/, "2-10 letters, numbers or dashes")
    .optional().or(z.literal("")).transform((v) => v || ""),
});

export const employeeDetailsSchema = z.object({
  firstName: z.string().trim().min(1, "Enter the first name").max(50),
  lastName: z.string().trim().min(1, "Enter the last name").max(50),
  gender: z.enum(GENDERS.map((g) => g.value), { errorMap: () => ({ message: "Select a gender" }) }),
  phone: z.string().trim().regex(/^[+0-9()\-\s]{7,20}$/, "Enter a valid phone number"),
  email: z.string().trim().email("Enter a valid email").max(120).or(z.literal("")).transform((v) => v || ""),
  address: z.string().trim().min(5, "Enter the address").max(250),
  staffType: z.enum(STAFF_TYPES.map((t) => t.value), { errorMap: () => ({ message: "Select a staff type" }) }),
  departmentId: z.string().optional().or(z.literal("")).transform((v) => v || ""),
  designation: z.string().trim().min(2, "Enter the designation").max(60),
  qualification: optional(120),
  joinDate: z.string().refine((v) => isValidDate(v) && v >= "1990-01-01", "Choose a valid date"),
});

export const employeeCreateSchema = employeeDetailsSchema.extend({
  campusId: z.string().min(1, "Select a campus"),
});

export const employeeStatusSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE"]),
  reason: z.string().trim().min(3, "Give a short reason").max(300),
});

export const assignSchema = z.object({
  sectionId: z.string().min(1),
  subjectId: z.string().min(1),
  employeeId: z.string().min(1, "Select a teacher"),
});

export const classTeacherSchema = z.object({
  sectionId: z.string().min(1),
  employeeId: z.string().optional().or(z.literal("")).transform((v) => v || ""),
});
