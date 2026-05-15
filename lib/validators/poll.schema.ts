import { z } from "zod";

export const pollOptionSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, "Option text is required"),
});

export const createPollSchema = z.object({
  title: z.string().min(1, "Title cannot be empty").trim(),
  description: z.string().optional(),
  type: z.enum(["single", "multi"]),
  visibility: z.enum(["public", "private"]),
  allowedEmails: z.array(z.string().trim().email("Invalid email").or(z.literal(""))).optional(),
  resultsVisibility: z.enum(["always", "after_voting"]),
  options: z.array(pollOptionSchema).min(2, "At least two options are required"),
  endAt: z.string().optional(), // Will parse to Date on server
});

export type CreatePollInput = z.infer<typeof createPollSchema>;
