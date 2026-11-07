import { z } from "zod";

export const AUDIENCES = [
  { value: "PARENTS_CAMPUS", label: "All parents of a campus" },
  { value: "PARENTS_CLASS", label: "Parents of a class" },
  { value: "PARENTS_SECTION", label: "Parents of a section" },
  { value: "STAFF_CAMPUS", label: "Staff of a campus" },
];

export const announcementSchema = z.object({
  title: z.string().trim().min(3, "Enter a title").max(120),
  body: z.string().trim().min(3, "Write the message").max(2000),
  type: z.enum(AUDIENCES.map((a) => a.value), { errorMap: () => ({ message: "Choose who receives it" }) }),
  campusId: z.string().max(40).optional().default(""),
  classId: z.string().max(40).optional().default(""),
  sectionId: z.string().max(40).optional().default(""),
  sendEmail: z.boolean().optional().default(false),
});
