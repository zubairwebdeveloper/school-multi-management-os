import { z } from "zod";
import { isValidDate } from "@/lib/utils/dates";

export const ATTENDANCE_STATUSES = [
  { value: "PRESENT", label: "Present", short: "P" },
  { value: "ABSENT", label: "Absent", short: "A" },
  { value: "LATE", label: "Late", short: "L" },
  { value: "LEAVE", label: "Leave", short: "Lv" },
  { value: "HALF_DAY", label: "Half day", short: "H" },
];
const statusEnum = z.enum(ATTENDANCE_STATUSES.map((s) => s.value), { errorMap: () => ({ message: "Select a status" }) });
const date = z.string().refine(isValidDate, "Choose a valid date");

export const saveAttendanceSchema = z.object({
  sectionId: z.string().min(1),
  date,
  entries: z.array(z.object({
    studentId: z.string().min(1),
    status: statusEnum,
    remark: z.string().trim().max(200).optional().default(""),
  })).min(1, "No students to save").max(250),
});

export const correctionRequestSchema = z.object({
  sectionId: z.string().min(1),
  studentId: z.string().min(1, "Select a student"),
  date,
  status: statusEnum,
  reason: z.string().trim().min(3, "Give a short reason").max(300),
});

export const reviewSchema = z
  .object({
    decision: z.enum(["APPROVED", "REJECTED"]),
    note: z.string().trim().max(300).optional().default(""),
  })
  .refine((v) => v.decision === "APPROVED" || v.note.length >= 3, { path: ["note"], message: "Give a reason for rejecting" });

export const MAX_BACKDATE_DAYS = 30;
