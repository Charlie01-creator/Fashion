export const ClothingCategories = [
  "top",
  "bottom",
  "outerwear",
  "footwear",
  "accessory",
  "dress",
  "other",
] as const;
export type ClothingCategory = (typeof ClothingCategories)[number];

export const ClothingSeasons = ["spring", "summer", "autumn", "winter", "all_season"] as const;
export type ClothingSeason = (typeof ClothingSeasons)[number];

export const ClothingOccasions = ["casual", "business", "formal", "athletic", "evening", "outdoor"] as const;
export type ClothingOccasion = (typeof ClothingOccasions)[number];

/**
 * Uppercase to read unambiguously as a pipeline/state-machine stage
 * (matches how it's used: transitions, not a free-text description).
 *   PENDING    — item created, queued for analysis, not yet started
 *   ANALYZING  — actively being processed by the AI provider right now
 *   COMPLETED  — aiMetadata holds a successful result
 *   FAILED     — analysis attempted and failed; aiErrorMessage explains why; retriable
 */
export const AiAnalysisStatuses = ["PENDING", "ANALYZING", "COMPLETED", "FAILED"] as const;
export type AiAnalysisStatus = (typeof AiAnalysisStatuses)[number];

export interface AiAnalysisMetadata {
  category: ClothingCategory;
  color: string;
  style: string;
  pattern: string;
  material: string;
  seasonSuitability: ClothingSeason[];
  occasionSuitability: ClothingOccasion[];
  tags: string[];
  confidence: number;
}

export interface ClothingItemDTO {
  id: string;
  userId: string;
  imageUrl: string;
  category: ClothingCategory;
  color: string;
  style: string | null;
  season: ClothingSeason;
  tags: string[];
  aiMetadata: AiAnalysisMetadata | null;
  aiStatus: AiAnalysisStatus;
  aiErrorMessage: string | null;
  aiAnalyzedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClothingItemInput {
  imageUrl: string;
  imageKey: string;
  category: ClothingCategory;
  color: string;
  style?: string;
  season: ClothingSeason;
  tags?: string[];
}

export interface ClothingListQuery {
  category?: ClothingCategory;
  page?: number;
  limit?: number;
}

export interface ClothingListResponse {
  items: ClothingItemDTO[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UploadImageResponse {
  url: string;
  key: string;
}
