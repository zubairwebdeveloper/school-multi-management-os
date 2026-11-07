import { z } from "zod";
import { isValidDate } from "@/lib/utils/dates";
import { parseMinor } from "@/lib/utils/money";

export const FREQUENCIES = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "TERM", label: "Per term" },
  { value: "ANNUAL", label: "Annual" },
  { value: "ONE_TIME", label: "One time" },
];

export const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BANK_TRANSFER", label: "Bank transfer" },
  { value: "JAZZCASH", label: "JazzCash (recorded)" },
  { value: "EASYPAISA", label: "Easypaisa (recorded)" },
  { value: "CARD", label: "Card (recorded)" },
];

const money = z.string().trim()
  .regex(/^\d{1,9}(\.\d{1,2})?$/, "Enter an amount like 1500 or 1500.50")
  .transform(parseMinor)
  .refine((v) => v > 0, "Amount must be greater than zero");

const date = z.string().refine(isValidDate, "Choose a valid date");
const freq = z.enum(FREQUENCIES.map((f) => f.value), { errorMap: () => ({ message: "Select a frequency" }) });

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Enter the category name").max(60),
});

export const structureSchema = z.object({
  classId: z.string().min(1, "Select a class"),
  lines: z.array(z.object({
    categoryId: z.string().min(1, "Select a category"),
    amount: money,
    frequency: freq,
  })).min(1, "Add at least one fee line").max(20),
}).superRefine((v, ctx) => {
  const seen = new Set();
  v.lines.forEach((l, i) => {
    const k = `${l.categoryId}_${l.frequency}`;
    if (seen.has(k)) ctx.addIssue({ code: "custom", path: ["lines", i, "categoryId"], message: "The same category and frequency is listed twice" });
    seen.add(k);
  });
});

export const generateSchema = z.object({
  classId: z.string().min(1, "Select a class"),
  sectionId: z.string().optional().or(z.literal("")).transform((v) => v || ""),
  frequency: freq,
  periodKey: z.string().trim().regex(/^[A-Za-z0-9-]{3,20}$/, "Use letters, numbers and dashes, e.g. 2026-11"),
  dueDate: date,
}).superRefine((v, ctx) => {
  if (v.frequency === "MONTHLY" && !/^\d{4}-(0[1-9]|1[0-2])$/.test(v.periodKey)) {
    ctx.addIssue({ code: "custom", path: ["periodKey"], message: "Monthly invoices use YYYY-MM, e.g. 2026-11" });
  }
});

export const paymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: money,
  method: z.enum(PAYMENT_METHODS.map((m) => m.value), { errorMap: () => ({ message: "Select a method" }) }),
  reference: z.string().trim().max(60).optional().or(z.literal("")).transform((v) => v || ""),
  receivedDate: date,
  note: z.string().trim().max(200).optional().or(z.literal("")).transform((v) => v || ""),
}).superRefine((v, ctx) => {
  if (v.method !== "CASH" && v.reference.length < 3) {
    ctx.addIssue({ code: "custom", path: ["reference"], message: "Enter the transaction / reference number" });
  }
});

export const reasonSchema = z.object({ reason: z.string().trim().min(3, "Give a short reason").max(300) });

export const concessionSchema = z.object({
  studentId: z.string().min(1),
  type: z.enum(["FIXED", "PERCENT"], { errorMap: () => ({ message: "Select a type" }) }),
  value: z.string().trim().min(1, "Enter a value"),
  reason: z.string().trim().min(3, "Give a short reason").max(200),
}).superRefine((v, ctx) => {
  if (v.type === "PERCENT") {
    const n = Number(v.value);
    if (!Number.isInteger(n) || n < 1 || n > 100) ctx.addIssue({ code: "custom", path: ["value"], message: "Percent must be a whole number from 1 to 100" });
  } else if (parseMinor(v.value) === null || parseMinor(v.value) <= 0) {
    ctx.addIssue({ code: "custom", path: ["value"], message: "Enter an amount like 500 or 500.50" });
  }
});
