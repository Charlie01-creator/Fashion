import { z } from "zod";
import { ClothingCategories, ClothingSeasons } from "@fashion-platform/shared";

const categoryEnum = z.enum(ClothingCategories);
const seasonEnum = z.enum(ClothingSeasons);

/**
 * `aiMetadata` is deliberately NOT accepted here — it's system-populated by
 * the future AI vision pipeline. If we let clients set it, they could spoof
 * "AI-analyzed" data that never touched a model. Any `aiMetadata` key sent
 * by the client is silently stripped by not being in this schema (zod
 * drops unknown keys by default in non-strict mode... but we use .strict()
 * below so it's explicitly rejected instead, which is a clearer signal to
 * a well-behaved client that it sent something it shouldn't have).
 */
export const createClothingItemSchema = z
  .object({
    imageUrl: z.string().url("imageUrl must be a valid URL"),
    imageKey: z.string().min(1, "imageKey is required"),
    category: categoryEnum,
    color: z.string().trim().min(1).max(50),
    style: z.string().trim().max(50).optional(),
    season: seasonEnum,
    tags: z.array(z.string().trim().min(1).max(30)).max(20).optional().default([]),
  })
  .strict();

export const listClothingQuerySchema = z.object({
  category: categoryEnum.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(24),
});

export type CreateClothingItemInput = z.infer<typeof createClothingItemSchema>;
export type ListClothingQuery = z.infer<typeof listClothingQuerySchema>;
