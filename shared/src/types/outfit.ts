import type { ClothingItemDTO } from "./clothing";
import type { OutfitFeedbackSummary } from "./style";

/**
 * User-facing occasions offered by the outfit generator. Deliberately a
 * separate vocabulary from ClothingOccasion (which describes what a single
 * garment suits, e.g. "business", "athletic", "outdoor") — the mapping
 * between the two lives in the recommendation engine, not here, since it's
 * matching logic rather than a shared contract.
 */
export const OutfitOccasions = ["casual", "formal", "party", "work", "wedding"] as const;
export type OutfitOccasion = (typeof OutfitOccasions)[number];

/**
 * Structure only, for now — see recommendation.engine.ts. Not wired to a
 * real weather API in this phase (would need network access + an API key),
 * but the shape exists end to end so a real integration later is additive,
 * not a redesign.
 */
export interface WeatherContext {
  temperatureC?: number;
  condition?: "sunny" | "rainy" | "cold" | "hot" | "mild" | "snowy";
}

export interface GenerateOutfitRequest {
  occasion: OutfitOccasion;
  weather?: WeatherContext;
}

export interface OutfitItemDTO {
  role: string | null;
  clothingItem: ClothingItemDTO;
}

export interface OutfitDTO {
  id: string;
  userId: string;
  occasion: OutfitOccasion;
  reasoning: string;
  styleExplanation: string;
  confidence: number;
  items: OutfitItemDTO[];
  feedback: OutfitFeedbackSummary;
  createdAt: string;
  updatedAt: string;
}

export interface GenerateOutfitResponse {
  recommendationId: string;
  outfits: OutfitDTO[];
}

export interface OutfitListResponse {
  items: OutfitDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
