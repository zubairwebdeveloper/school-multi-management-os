import { z } from "zod";
import { isValidDate } from "@/lib/utils/dates";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");

export const periodsSchema = z
  .object({
    campusId: z.string().min(1, "Select a campus"),
    days: z.array(z.number().int().min(1).max(7)).min(1, "Select at least one day").max(7),
    periods: z.array(z.object({
      id: z.string().max(20).optional().default(""),
      name: z.string().trim().min(1, "Name every period").max(30),
      start: time,
      end: time,
      isBreak: z.boolean().optional().default(false),
    })).min(1, "Add at least one period").max(14),
  })
  .superRefine((v, ctx) => {
    const names = new Set();
    v.periods.forEach((p, i) => {
      if (p.start >= p.end) ctx.addIssue({ code: "custom", path: ["periods", i, "end"], message: `${p.name}: end must be after start` });
      if (i > 0 && p.start < v.periods[i - 1].end) ctx.addIssue({ code: "custom", path: ["periods", i, "start"], message: `${p.name} overlaps the previous period` });
      const k = p.name.toLowerCase();
      if (names.has(k)) ctx.addIssue({ code: "custom", path: ["periods", i, "name"], message: `Duplicate period name "${p.name}"` });
      names.add(k);
    });
    if (!v.periods.some((p) => !p.isBreak)) ctx.addIssue({ code: "custom", path: ["periods"], message: "At least one period must be a lesson (not a break)" });
  });

export const lessonSchema = z.object({
  sectionId: z.string().min(1),
  day: z.number().int().min(1).max(7),
  periodId: z.string().min(1),
  subjectId: z.string().min(1, "Select a subject"),
  room: z.string().trim().max(40).optional().default(""),
});

export const clearLessonSchema = lessonSchema.pick({ sectionId: true, day: true, periodId: true });

export const substitutionSchema = z.object({
  date: z.string().refine(isValidDate, "Choose a valid date"),
  sectionId: z.string().min(1, "Select a section"),
  periodId: z.string().min(1, "Select a period"),
  substituteEmployeeId: z.string().min(1, "Select a teacher"),
  reason: z.string().trim().min(3, "Give a short reason").max(200),
});

export const DEFAULT_PERIODS = [
  { id: "", name: "Period 1", start: "08:00", end: "08:40", isBreak: false },
  { id: "", name: "Period 2", start: "08:40", end: "09:20", isBreak: false },
  { id: "", name: "Period 3", start: "09:20", end: "10:00", isBreak: false },
  { id: "", name: "Break", start: "10:00", end: "10:20", isBreak: true },
  { id: "", name: "Period 4", start: "10:20", end: "11:00", isBreak: false },
  { id: "", name: "Period 5", start: "11:00", end: "11:40", isBreak: false },
];
