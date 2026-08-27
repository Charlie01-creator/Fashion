export const OutfitFeedbackActions = ["LIKE", "DISLIKE", "SAVED", "WORN"] as const;
export type OutfitFeedbackAction = (typeof OutfitFeedbackActions)[number];

export interface SubmitOutfitFeedbackRequest {
  action: OutfitFeedbackAction;
}

/**
 * Derived from the OutfitFeedback event log, not a stored flag — see the
 * backend schema comment on OutfitFeedback for why it's append-only.
 */
export interface OutfitFeedbackSummary {
  latestReaction: "LIKE" | "DISLIKE" | null;
  saved: boolean;
  wornCount: number;
}

export interface StyleProfileDTO {
  id: string;
  userId: string;
  dominantStyle: string;
  /** Style name -> percentage of wardrobe/behavior attributed to it. Values sum to ~100. */
  stylePercentages: Record<string, number>;
  favouriteColors: string[];
  preferredCategories: string[];
  recommendedImprovements: string[];
  confidenceScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserFashionPreferenceDTO {
  id: string;
  userId: string;
  preferredStyles: string[];
  dislikedStyles: string[];
  favoriteColors: string[];
  occasionPreferences: Record<string, string[]> | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateFashionPreferenceRequest {
  preferredStyles?: string[];
  dislikedStyles?: string[];
  favoriteColors?: string[];
  occasionPreferences?: Record<string, string[]>;
}
