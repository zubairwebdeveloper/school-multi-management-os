import { z } from "zod";
import { CURRICULA, INSTITUTION_TYPES } from "@/lib/onboarding/constants";

const text = (min, max, msg) =>
  z.string().trim().min(min, msg || `At least ${min} characters`).max(max);

const optionalText = (max) =>
  z.string().trim().max(max).optional().or(z.literal("")).transform((v) => v || "");

const phone = z
  .string()
  .trim()
  .regex(/^[+0-9()\-\s]{7,20}$/, "Enter a valid phone number");

export const applicationSchema = z.object({
  organization: z.object({
    name: text(3, 120, "Enter the organization name"),
    institutionType: z.enum(INSTITUTION_TYPES.map((t) => t.value)),
    contactEmail: z.string().trim().email("Enter a valid email").max(120),
    contactPhone: phone,
    website: optionalText(200),
    city: text(2, 80, "Enter the city"),
    country: text(2, 80, "Enter the country"),
    address: text(5, 250, "Enter the address"),
    curricula: z.array(z.enum(CURRICULA.map((c) => c.value))).min(1, "Select at least one curriculum"),
    expectedStudents: z.coerce.number().int().min(1, "Enter a number").max(200000),
  }),
  campus: z.object({
    name: text(3, 120, "Enter the campus name"),
    city: text(2, 80, "Enter the campus city"),
    address: text(5, 250, "Enter the campus address"),
    phone: phone,
  }),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: "You must accept the terms" }) }),
});
