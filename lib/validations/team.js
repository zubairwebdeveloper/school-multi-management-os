import { z } from "zod";

export const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(120),
  role: z.string().min(1, "Select a role").max(40),
  campusIds: z.array(z.string().min(1).max(40)).max(30).default([]),
  employeeId: z.string().max(40).optional().or(z.literal("")).transform((v) => v || ""),
});

export const memberUpdateSchema = z.object({
  role: z.string().min(1, "Select a role").max(40),
  campusIds: z.array(z.string().min(1).max(40)).max(30).default([]),
});

export const INVITE_TTL_DAYS = 7;
