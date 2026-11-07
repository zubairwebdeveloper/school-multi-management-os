import { z } from "zod";

export const EXAM_TYPES = [
  { value: "MONTHLY", label: "Monthly test" },
  { value: "MIDTERM", label: "Midterm" },
  { value: "FINAL", label: "Final examination" },
  { value: "ANNUAL", label: "Annual examination" },
  { value: "OTHER", label: "Other assessment" },
];

export const DEFAULT_BANDS = [
  { grade: "A1", min: 90 }, { grade: "A", min: 80 }, { grade: "B", min: 70 },
  { grade: "C", min: 60 }, { grade: "D", min: 50 }, { grade: "E", min: 40 }, { grade: "F", min: 0 },
];

export const gradingSchema = z.object({
  name: z.string().trim().min(2, "Enter a name").max(60),
  bands: z.array(z.object({
    grade: z.string().trim().min(1, "Enter a grade").max(4),
    min: z.coerce.number({ invalid_type_error: "Enter a number" }).int("Whole number").min(0).max(100),
  })).min(2, "Add at least two grades").max(12),
}).superRefine((v, ctx) => {
  v.bands.forEach((b, i) => {
    if (i > 0 && b.min >= v.bands[i - 1].min) ctx.addIssue({ code: "custom", path: ["bands", i, "min"], message: "List grades from highest to lowest percentage" });
  });
  if (v.bands.at(-1).min !== 0) ctx.addIssue({ code: "custom", path: ["bands"], message: "The lowest grade must start at 0%" });
  const seen = new Set();
  v.bands.forEach((b, i) => { const k = b.grade.toLowerCase(); if (seen.has(k)) ctx.addIssue({ code: "custom", path: ["bands", i, "grade"], message: "Duplicate grade" }); seen.add(k); });
});

const subjectLine = z.object({
  subjectId: z.string().min(1, "Select a subject"),
  total: z.coerce.number({ invalid_type_error: "Enter total marks" }).int("Whole number").min(1).max(1000),
});
const uniqueSubjects = (v, ctx) => {
  const seen = new Set();
  v.subjects.forEach((s, i) => { if (seen.has(s.subjectId)) ctx.addIssue({ code: "custom", path: ["subjects", i, "subjectId"], message: "Subject listed twice" }); seen.add(s.subjectId); });
};

const examBase = {
  name: z.string().trim().min(3, "Enter the exam name").max(60),
  type: z.enum(EXAM_TYPES.map((t) => t.value), { errorMap: () => ({ message: "Select a type" }) }),
  passPercent: z.coerce.number({ invalid_type_error: "Enter a percentage" }).int("Whole number").min(1).max(100),
  subjects: z.array(subjectLine).min(1, "Add at least one subject").max(20),
};

export const examCreateSchema = z.object({
  classId: z.string().min(1, "Select a class"),
  gradingSystemId: z.string().min(1, "Select a grading system"),
  ...examBase,
}).superRefine(uniqueSubjects);

export const examUpdateSchema = z.object(examBase).superRefine(uniqueSubjects);

export const saveMarksSchema = z.object({
  examId: z.string().min(1),
  sectionId: z.string().min(1),
  subjectId: z.string().min(1),
  submit: z.boolean().optional().default(false),
  entries: z.array(z.object({
    studentId: z.string().min(1),
    obtained: z.string().trim().max(8).default(""),
    absent: z.boolean().default(false),
  })).min(1, "No students to save").max(300),
});

export const slotSchema = z.object({ examId: z.string().min(1), sectionId: z.string().min(1), subjectId: z.string().min(1) });
export const reasonSchema = z.object({ reason: z.string().trim().min(3, "Give a short reason").max(300) });
