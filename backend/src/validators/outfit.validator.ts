import { z } from "zod";
import { OutfitOccasions } from "@fashion-platform/shared";

const weatherConditionEnum = z.enum(["sunny", "rainy", "cold", "hot", "mild", "snowy"]);

export const generateOutfitSchema = z
  .object({
    occasion: z.enum(OutfitOccasions),
    weather: z
      .object({
        temperatureC: z.number().min(-50).max(60).optional(),
        condition: weatherConditionEnum.optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const listOutfitsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

export type GenerateOutfitInput = z.infer<typeof generateOutfitSchema>;
export type ListOutfitsQuery = z.infer<typeof listOutfitsQuerySchema>;
