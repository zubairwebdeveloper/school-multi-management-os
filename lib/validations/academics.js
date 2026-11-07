import { z } from "zod";
import { CURRICULA } from "@/lib/onboarding/constants";

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid date")
  .refine((v) => !Number.isNaN(Date.parse(v)), "Choose a valid date");

const range = (v) => v.startDate < v.endDate;
const rangeMsg = { path: ["endDate"], message: "End date must be after the start date" };

export const sessionSchema = z
  .object({ name: z.string().trim().min(4, "Enter a name, e.g. 2026-2027").max(40), startDate: date, endDate: date })
  .refine(range, rangeMsg);

export const termSchema = z
  .object({ name: z.string().trim().min(2, "Enter a name, e.g. Term 1").max(40), startDate: date, endDate: date })
  .refine(range, rangeMsg);

const curriculumValues = CURRICULA.map((c) => c.value);

export const classSchema = z.object({
  campusId: z.string().min(1, "Select a campus"),
  name: z.string().trim().min(1, "Enter a class name").max(60),
  level: z.coerce.number().int("Whole number").min(0).max(30),
  curriculum: z.enum(curriculumValues, { errorMap: () => ({ message: "Select a curriculum" }) }),
});
export const classUpdateSchema = classSchema.omit({ campusId: true });

export const sectionSchema = z.object({
  classId: z.string().min(1),
  sessionId: z.string().min(1, "Select a session"),
  name: z.string().trim().min(1, "Enter a section name").max(20),
  capacity: z.coerce.number().int("Whole number").min(1, "At least 1").max(200),
});
export const sectionUpdateSchema = sectionSchema.pick({ name: true, capacity: true });

export const SUBJECT_CATEGORIES = [
  { value: "CORE", label: "Core" },
  { value: "ELECTIVE", label: "Elective" },
  { value: "CO_CURRICULAR", label: "Co-curricular" },
];

export const subjectSchema = z.object({
  name: z.string().trim().min(2, "Enter the subject name").max(80),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^([A-Z0-9-]{2,12})?$/, "2-12 letters, numbers or dashes")
    .optional()
    .or(z.literal(""))
    .transform((v) => v || ""),
  category: z.enum(SUBJECT_CATEGORIES.map((c) => c.value)),
  curriculum: z.enum(["ALL", ...curriculumValues]),
});

export function parseInput(schema, input) {
  const r = schema.safeParse(input);
  if (r.success) return { data: r.data };
  return {
    error: { ok: false, error: "Please fix the highlighted fields.", fieldErrors: r.error.flatten().fieldErrors },
  };
}
