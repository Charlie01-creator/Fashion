import type { AiAnalysisMetadata, ClothingCategory, ClothingOccasion } from "@fashion-platform/shared";
import type { OutfitOccasion, WeatherContext } from "@fashion-platform/shared";

/**
 * The engine only needs a slice of ClothingItem — not the full DTO (no
 * image URL, no timestamps). Keeping this narrow means the engine's input
 * type doesn't silently grow coupled to unrelated ClothingItem fields, and
 * makes it obvious at a glance exactly what the matching logic is allowed
 * to reason about.
 */
export interface WardrobeItemInput {
  id: string;
  category: ClothingCategory;
  color: string;
  style: string | null;
  season: string;
  tags: string[];
  aiMetadata: AiAnalysisMetadata | null;
}

export interface StylePreferencesInput {
  stylePreferences: string[];
  favouriteColors: string[];
}

/**
 * Narrow slice of StyleProfileDTO — only the fields the engine actually
 * reasons over. Optional everywhere it's consumed: a brand-new user with
 * no generated Style Profile yet must still get outfits, just without this
 * extra signal biasing the result.
 */
export interface StyleProfileInput {
  dominantStyle: string;
  stylePercentages: Record<string, number>;
  favouriteColors: string[];
}

export interface GenerateOutfitsInput {
  wardrobe: WardrobeItemInput[];
  occasion: OutfitOccasion;
  weather?: WeatherContext;
  stylePreferences: StylePreferencesInput;
  /** From the Style DNA engine (services/style/) — null if the user hasn't generated a profile yet. */
  styleProfile?: StyleProfileInput | null;
  /** clothingItemId -> weighted score from past LIKE/DISLIKE/WORN feedback. Missing entries are treated as 0 (no history either way). */
  itemFeedbackScores?: Record<string, number>;
}

export interface OutfitCandidate {
  /** clothingItemId -> the slot it fills. Order isn't meaningful; role is. */
  items: { clothingItemId: string; role: ClothingCategory }[];
  occasion: OutfitOccasion;
  reasoning: string;
  styleExplanation: string;
  confidence: number;
}

/**
 * Every recommendation engine (this rule-based one, or a real ML-ranked
 * one later) implements this one interface. `outfit.service.ts` only ever
 * imports the `recommendationEngine` singleton from `recommendation.engine.ts`
 * — same replaceable-provider pattern as storage and AI analysis.
 */
export interface RecommendationEngine {
  generate(input: GenerateOutfitsInput): Promise<OutfitCandidate[]>;
}

/**
 * Maps the user-facing generation occasion to the garment-level occasion
 * tags produced by AI analysis (see AiAnalysisMetadata.occasionSuitability).
 * These are two different vocabularies on purpose — one describes what a
 * single garment suits in general, the other is what a user picks when
 * asking for an outfit — so this mapping is the seam between them.
 */
export const OUTFIT_OCCASION_TO_GARMENT_OCCASIONS: Record<OutfitOccasion, ClothingOccasion[]> = {
  casual: ["casual"],
  formal: ["formal"],
  party: ["evening", "formal"],
  work: ["business"],
  wedding: ["formal", "evening"],
};

export class InsufficientWardrobeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsufficientWardrobeError";
  }
}
