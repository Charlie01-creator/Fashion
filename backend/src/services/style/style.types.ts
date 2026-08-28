import type { AiAnalysisMetadata, ClothingCategory } from "@fashion-platform/shared";

/** Narrow slice of ClothingItem the analyzer needs — see the equivalent note in outfits/outfit.types.ts. */
export interface WardrobeItemForStyle {
  category: ClothingCategory;
  color: string;
  style: string | null;
  aiMetadata: AiAnalysisMetadata | null;
}

/** One past outfit, reduced to what the analyzer reasons about: its items and how the user reacted to it. */
export interface OutfitHistoryEntry {
  items: { category: ClothingCategory; color: string; style: string | null }[];
  feedbackActions: string[]; // raw OutfitFeedbackAction strings for this outfit, most recent last
}

export interface ExplicitPreferencesInput {
  preferredStyles: string[];
  dislikedStyles: string[];
  favoriteColors: string[];
}

export interface StyleAnalysisInput {
  wardrobe: WardrobeItemForStyle[];
  outfitHistory: OutfitHistoryEntry[];
  explicitPreferences: ExplicitPreferencesInput | null;
}

export interface StyleProfileData {
  dominantStyle: string;
  stylePercentages: Record<string, number>;
  favouriteColors: string[];
  preferredCategories: string[];
  recommendedImprovements: string[];
  confidenceScore: number;
}

/**
 * Same replaceable-provider pattern as storage, AI clothing analysis, and
 * outfit recommendation: `style.service.ts` only ever calls the exported
 * `styleAnalyzer` singleton from `style.analyzer.ts`, never a concrete
 * class. A future ML-based style analyzer is a new implementation of this
 * interface, not a rewrite of the service around it.
 */
export interface StyleAnalyzer {
  analyze(input: StyleAnalysisInput): Promise<StyleProfileData>;
}
