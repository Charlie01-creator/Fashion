import { z } from "zod";
import { OutfitFeedbackActions } from "@fashion-platform/shared";

export const submitFeedbackSchema = z
  .object({
    action: z.enum(OutfitFeedbackActions),
  })
  .strict();

export const updateFashionPreferenceSchema = z
  .object({
    preferredStyles: z.array(z.string().trim().min(1).max(30)).max(20).optional(),
    dislikedStyles: z.array(z.string().trim().min(1).max(30)).max(20).optional(),
    favoriteColors: z.array(z.string().trim().min(1).max(30)).max(20).optional(),
    occasionPreferences: z.record(z.array(z.string().trim().min(1).max(30)).max(10)).optional(),
  })
  .strict();

export type SubmitFeedbackInput = z.infer<typeof submitFeedbackSchema>;
export type UpdateFashionPreferenceInput = z.infer<typeof updateFashionPreferenceSchema>;
