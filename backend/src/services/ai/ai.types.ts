import { z } from "zod";
import { ClothingCategories, ClothingOccasions, ClothingSeasons } from "@fashion-platform/shared";

export interface ClothingAnalysisInput {
  imageUrl: string;
}

/**
 * Every provider's raw output — mock or real vision model — is parsed
 * through this schema before it's trusted anywhere else in the app. A real
 * vision API can and will occasionally return malformed or unexpected JSON
 * (wrong enum value, missing field, confidence out of range); validating
 * here means that shows up as a clean "analysis failed, retry" instead of
 * bad data silently reaching the database or the client.
 *
 * Confidence is a single scalar 0–1 for the analysis as a whole, not
 * per-field — deliberately simple for this phase.
 */
export const clothingAnalysisResultSchema = z.object({
  category: z.enum(ClothingCategories),
  color: z.string().trim().min(1).max(50),
  style: z.string().trim().min(1).max(50),
  pattern: z.string().trim().min(1).max(50),
  material: z.string().trim().min(1).max(50),
  seasonSuitability: z.array(z.enum(ClothingSeasons)).min(1).max(5),
  occasionSuitability: z.array(z.enum(ClothingOccasions)).min(1).max(6),
  tags: z.array(z.string().trim().min(1).max(30)).max(10),
  confidence: z.number().min(0).max(1),
});

export type ClothingAnalysisResult = z.infer<typeof clothingAnalysisResultSchema>;

/**
 * Every AI provider (mock, a real vision model, a future custom model)
 * implements this one interface. Nothing outside `services/ai/` should
 * import a concrete provider class directly — always go through
 * `index.ts`'s exported singleton, so swapping providers never touches
 * calling code.
 */
export interface ClothingAnalyzer {
  analyze(input: ClothingAnalysisInput): Promise<ClothingAnalysisResult>;
}
