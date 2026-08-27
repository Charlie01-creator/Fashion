import { prisma } from "../../config/database";
import { AppError } from "../../utils/AppError";
import { styleAnalyzer } from "./style.analyzer";
import type {
  ExplicitPreferencesInput,
  OutfitHistoryEntry,
  StyleProfileData,
  WardrobeItemForStyle,
} from "./style.types";
import type {
  AiAnalysisMetadata,
  ClothingCategory,
  StyleProfileDTO,
  UpdateFashionPreferenceRequest,
  UserFashionPreferenceDTO,
} from "@fashion-platform/shared";

// Bounds on how much history feeds one profile computation — a user with
// years of activity shouldn't make this endpoint scale linearly with their
// entire lifetime history. Recent activity is also just more representative
// of *current* taste than everything they've ever done.
const MAX_WARDROBE_ITEMS = 500;
const MAX_OUTFIT_HISTORY = 100;
const MAX_FEEDBACK_EVENTS = 300;

function styleProfileToDTO(row: {
  id: string;
  userId: string;
  dominantStyle: string;
  styleData: unknown;
  confidenceScore: number;
  createdAt: Date;
  updatedAt: Date;
}): StyleProfileDTO {
  const data = row.styleData as Omit<StyleProfileData, "dominantStyle" | "confidenceScore">;
  return {
    id: row.id,
    userId: row.userId,
    dominantStyle: row.dominantStyle,
    stylePercentages: data.stylePercentages,
    favouriteColors: data.favouriteColors,
    preferredCategories: data.preferredCategories,
    recommendedImprovements: data.recommendedImprovements,
    confidenceScore: row.confidenceScore,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function preferenceToDTO(row: {
  id: string;
  userId: string;
  preferredStyles: string[];
  dislikedStyles: string[];
  favoriteColors: string[];
  occasionPreferences: unknown;
  createdAt: Date;
  updatedAt: Date;
}): UserFashionPreferenceDTO {
  return {
    id: row.id,
    userId: row.userId,
    preferredStyles: row.preferredStyles,
    dislikedStyles: row.dislikedStyles,
    favoriteColors: row.favoriteColors,
    occasionPreferences: (row.occasionPreferences as Record<string, string[]> | null) ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function gatherAnalysisInputs(userId: string): Promise<{
  wardrobe: WardrobeItemForStyle[];
  outfitHistory: OutfitHistoryEntry[];
  explicitPreferences: ExplicitPreferencesInput | null;
}> {
  const [wardrobeRows, outfitRows, preferenceRow] = await Promise.all([
    prisma.clothingItem.findMany({
      where: { userId },
      select: { category: true, color: true, style: true, aiMetadata: true },
      take: MAX_WARDROBE_ITEMS,
      orderBy: { createdAt: "desc" },
    }),
    prisma.outfit.findMany({
      where: { userId },
      select: {
        items: { select: { clothingItem: { select: { category: true, color: true, style: true } } } },
        feedback: { select: { action: true }, orderBy: { createdAt: "asc" } },
      },
      take: MAX_OUTFIT_HISTORY,
      orderBy: { createdAt: "desc" },
    }),
    prisma.userFashionPreference.findUnique({ where: { userId } }),
  ]);

  const wardrobe: WardrobeItemForStyle[] = wardrobeRows.map((item) => ({
    category: item.category as ClothingCategory,
    color: item.color,
    style: item.style,
    aiMetadata: item.aiMetadata as AiAnalysisMetadata | null,
  }));

  const outfitHistory: OutfitHistoryEntry[] = outfitRows.map((outfit) => ({
    items: outfit.items.map((oi) => ({
      category: oi.clothingItem.category as ClothingCategory,
      color: oi.clothingItem.color,
      style: oi.clothingItem.style,
    })),
    feedbackActions: outfit.feedback.map((f) => f.action),
  }));

  const explicitPreferences: ExplicitPreferencesInput | null = preferenceRow
    ? {
        preferredStyles: preferenceRow.preferredStyles,
        dislikedStyles: preferenceRow.dislikedStyles,
        favoriteColors: preferenceRow.favoriteColors,
      }
    : null;

  return { wardrobe, outfitHistory, explicitPreferences };
}

export const styleService = {
  /**
   * Recomputes and persists the user's Style Profile. Explicit action
   * (POST /style-profile/generate), not run automatically on every read —
   * this is a deliberate cost/freshness trade-off: recomputation touches
   * the user's whole wardrobe and outfit history, which is cheap for one
   * user on demand but not something you want happening implicitly on
   * every page view.
   */
  async generateProfile(userId: string): Promise<StyleProfileDTO> {
    const inputs = await gatherAnalysisInputs(userId);
    const result = await styleAnalyzer.analyze(inputs);

    const saved = await prisma.styleProfile.upsert({
      where: { userId },
      create: {
        userId,
        dominantStyle: result.dominantStyle,
        styleData: result as any,
        confidenceScore: result.confidenceScore,
      },
      update: {
        dominantStyle: result.dominantStyle,
        styleData: result as any,
        confidenceScore: result.confidenceScore,
      },
    });

    return styleProfileToDTO(saved);
  },

  /** Returns the cached profile, or a 404 the frontend interprets as "not generated yet". */
  async getProfile(userId: string): Promise<StyleProfileDTO> {
    const profile = await prisma.styleProfile.findUnique({ where: { userId } });
    if (!profile) {
      throw AppError.notFound("No style profile yet — generate one first");
    }
    return styleProfileToDTO(profile);
  },

  async getPreferences(userId: string): Promise<UserFashionPreferenceDTO | null> {
    const row = await prisma.userFashionPreference.findUnique({ where: { userId } });
    return row ? preferenceToDTO(row) : null;
  },

  async updatePreferences(
    userId: string,
    input: UpdateFashionPreferenceRequest
  ): Promise<UserFashionPreferenceDTO> {
    const row = await prisma.userFashionPreference.upsert({
      where: { userId },
      create: {
        userId,
        preferredStyles: input.preferredStyles ?? [],
        dislikedStyles: input.dislikedStyles ?? [],
        favoriteColors: input.favoriteColors ?? [],
        occasionPreferences: input.occasionPreferences as any,
      },
      update: {
        ...(input.preferredStyles !== undefined ? { preferredStyles: input.preferredStyles } : {}),
        ...(input.dislikedStyles !== undefined ? { dislikedStyles: input.dislikedStyles } : {}),
        ...(input.favoriteColors !== undefined ? { favoriteColors: input.favoriteColors } : {}),
        ...(input.occasionPreferences !== undefined
          ? { occasionPreferences: input.occasionPreferences as any }
          : {}),
      },
    });
    return preferenceToDTO(row);
  },

  /**
   * Shared with outfit.service.ts: computes a weighted positive/negative
   * score per clothing item from the user's recent feedback history, so
   * the recommendation engine can favor items the user has responded well
   * to and de-emphasize ones they've disliked. Lives here (not duplicated
   * in the outfits service) because "how feedback translates into a
   * score" is exactly the same interpretation the style analyzer uses —
   * one place defines what a LIKE/DISLIKE/WORN is worth.
   */
  async getItemFeedbackScores(userId: string): Promise<Record<string, number>> {
    const feedbackRows = await prisma.outfitFeedback.findMany({
      where: { userId },
      select: { action: true, outfit: { select: { items: { select: { clothingItemId: true } } } } },
      orderBy: { createdAt: "desc" },
      take: MAX_FEEDBACK_EVENTS,
    });

    const scores: Record<string, number> = {};
    for (const row of feedbackRows) {
      const delta = row.action === "WORN" ? 1.5 : row.action === "LIKE" ? 1 : row.action === "DISLIKE" ? -1 : 0;
      if (delta === 0) continue;
      for (const item of row.outfit.items) {
        scores[item.clothingItemId] = (scores[item.clothingItemId] ?? 0) + delta;
      }
    }
    return scores;
  },
};
