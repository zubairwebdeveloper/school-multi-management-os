import { z } from "zod";

export const CAMPUS_TYPES = [
  { value: "MIXED", label: "Co-educational" },
  { value: "BOYS", label: "Boys" },
  { value: "GIRLS", label: "Girls" },
];

const optional = (max) =>
  z.string().trim().max(max).optional().or(z.literal("")).transform((v) => v || "");

export const campusSchema = z.object({
  name: z.string().trim().min(3, "Enter the campus name").max(120),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^([A-Z0-9-]{2,10})?$/, "2-10 letters, numbers or dashes")
    .optional()
    .or(z.literal(""))
    .transform((v) => v || ""),
  campusType: z.enum(CAMPUS_TYPES.map((t) => t.value)),
  city: z.string().trim().min(2, "Enter the city").max(80),
  address: z.string().trim().min(5, "Enter the address").max(250),
  phone: z.string().trim().regex(/^[+0-9()\-\s]{7,20}$/, "Enter a valid phone number"),
  email: z.string().trim().email("Enter a valid email").max(120).or(z.literal("")).transform((v) => v || ""),
  notes: optional(500),
});
