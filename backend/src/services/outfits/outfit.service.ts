import { prisma } from "../../config/database";
import { AppError } from "../../utils/AppError";
import { recommendationEngine } from "./recommendation.engine";
import { InsufficientWardrobeError } from "./outfit.types";
import type { WardrobeItemInput } from "./outfit.types";
import { styleService } from "../style/style.service";
import type { GenerateOutfitRequest, OutfitFeedbackAction, OutfitFeedbackSummary } from "@fashion-platform/shared";
import type {
  AiAnalysisMetadata,
  AiAnalysisStatus,
  ClothingCategory,
  ClothingSeason,
  OutfitOccasion,
} from "@fashion-platform/shared";

/** Shape returned by Prisma for a ClothingItem row joined onto an OutfitItem. */
interface ClothingRow {
  id: string;
  userId: string;
  imageUrl: string;
  category: string;
  color: string;
  style: string | null;
  season: string;
  tags: string[];
  aiMetadata: unknown;
  aiStatus: string;
  aiErrorMessage: string | null;
  aiAnalyzedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

function clothingToDTO(item: ClothingRow) {
  return {
    id: item.id,
    userId: item.userId,
    imageUrl: item.imageUrl,
    category: item.category as ClothingCategory,
    color: item.color,
    style: item.style,
    season: item.season as ClothingSeason,
    tags: item.tags,
    aiMetadata: item.aiMetadata as AiAnalysisMetadata | null,
    aiStatus: item.aiStatus as AiAnalysisStatus,
    aiErrorMessage: item.aiErrorMessage,
    aiAnalyzedAt: item.aiAnalyzedAt ? item.aiAnalyzedAt.toISOString() : null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

/** Derived from the raw event log, newest-first — see the OutfitFeedback schema comment for why this isn't a stored flag. */
function computeFeedbackSummary(feedbackRows: { action: string }[]): OutfitFeedbackSummary {
  const latest = feedbackRows.find((f) => f.action === "LIKE" || f.action === "DISLIKE");
  return {
    latestReaction: (latest?.action as "LIKE" | "DISLIKE" | undefined) ?? null,
    saved: feedbackRows.some((f) => f.action === "SAVED"),
    wornCount: feedbackRows.filter((f) => f.action === "WORN").length,
  };
}

function outfitToDTO(outfit: {
  id: string;
  userId: string;
  occasion: string;
  reasoning: string;
  styleExplanation: string;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
  items: { role: string | null; clothingItem: ClothingRow }[];
  feedback: { action: string }[];
}) {
  return {
    id: outfit.id,
    userId: outfit.userId,
    occasion: outfit.occasion as OutfitOccasion,
    reasoning: outfit.reasoning,
    styleExplanation: outfit.styleExplanation,
    confidence: outfit.confidence,
    items: outfit.items.map((oi) => ({ role: oi.role, clothingItem: clothingToDTO(oi.clothingItem) })),
    feedback: computeFeedbackSummary(outfit.feedback),
    createdAt: outfit.createdAt.toISOString(),
    updatedAt: outfit.updatedAt.toISOString(),
  };
}

const outfitInclude = {
  items: { include: { clothingItem: true } },
  // Newest-first so computeFeedbackSummary's `.find()` for the latest
  // LIKE/DISLIKE is a simple linear scan, no extra sort needed.
  feedback: { select: { action: true }, orderBy: { createdAt: "desc" as const } },
} as const;

export const outfitService = {
  /**
   * Generates 1–3 outfit candidates from the user's own wardrobe and
   * persists them immediately as saved Outfit rows linked to one
   * OutfitRecommendation batch. Generation is synchronous (unlike AI
   * clothing analysis) — the rule-based engine runs in milliseconds, so
   * there's no reason to make the user wait on a "pending" state for this.
   * If a future engine implementation is slow (a real ranking model call),
   * this is the seam where that would move to the same queue pattern used
   * for clothing analysis.
   */
  async generate(userId: string, request: GenerateOutfitRequest) {
    const [wardrobeRows, profile, styleProfileRow, itemFeedbackScores] = await Promise.all([
      // Capped defensively — the recommendation engine only needs a
      // reasonably-sized working set to build a few outfit candidates, and
      // an unbounded fetch here would scale badly for a wardrobe with
      // thousands of items. 500 is comfortably above any realistic
      // wardrobe size today; revisit if that assumption changes.
      prisma.clothingItem.findMany({ where: { userId }, take: 500, orderBy: { createdAt: "desc" } }),
      prisma.userProfile.findUnique({ where: { userId } }),
      // Style profile is optional — a brand-new user won't have generated
      // one yet, and generation must still work without it.
      prisma.styleProfile.findUnique({ where: { userId } }),
      styleService.getItemFeedbackScores(userId),
    ]);

    const wardrobe: WardrobeItemInput[] = wardrobeRows.map((item) => ({
      id: item.id,
      category: item.category as ClothingCategory,
      color: item.color,
      style: item.style,
      season: item.season,
      tags: item.tags,
      aiMetadata: item.aiMetadata as AiAnalysisMetadata | null,
    }));

    const stylePreferences = {
      stylePreferences: profile?.stylePreferences ?? [],
      favouriteColors: profile?.favouriteColors ?? [],
    };

    const styleProfileInput = styleProfileRow
      ? {
          dominantStyle: styleProfileRow.dominantStyle,
          stylePercentages: (styleProfileRow.styleData as any).stylePercentages ?? {},
          favouriteColors: (styleProfileRow.styleData as any).favouriteColors ?? [],
        }
      : null;

    let candidates;
    try {
      candidates = await recommendationEngine.generate({
        wardrobe,
        occasion: request.occasion,
        weather: request.weather,
        stylePreferences,
        styleProfile: styleProfileInput,
        itemFeedbackScores,
      });
    } catch (err) {
      if (err instanceof InsufficientWardrobeError) {
        throw AppError.badRequest(err.message);
      }
      throw err;
    }

    const recommendation = await prisma.outfitRecommendation.create({
      data: {
        userId,
        occasion: request.occasion,
        weatherContext: request.weather ? (request.weather as any) : undefined,
        stylePreferencesSnapshot: stylePreferences as any,
      },
    });

    // Each outfit + its items is created in one transaction — an outfit
    // should never exist half-populated (e.g. saved but missing the shoe
    // slot because a later insert failed). Sequential, not Promise.all:
    // there are only 1-3 candidates, and running interactive transactions
    // concurrently would each hold a connection from the pool at once for
    // no real latency benefit at this scale.
    const outfits = [];
    for (const candidate of candidates) {
      const outfit = await prisma.$transaction(async (tx) => {
        const created = await tx.outfit.create({
          data: {
            userId,
            recommendationId: recommendation.id,
            occasion: candidate.occasion,
            reasoning: candidate.reasoning,
            styleExplanation: candidate.styleExplanation,
            confidence: candidate.confidence,
          },
        });

        await tx.outfitItem.createMany({
          data: candidate.items.map((i) => ({
            outfitId: created.id,
            clothingItemId: i.clothingItemId,
            role: i.role,
          })),
        });

        return tx.outfit.findUniqueOrThrow({ where: { id: created.id }, include: outfitInclude });
      });
      outfits.push(outfit);
    }

    return {
      recommendationId: recommendation.id,
      outfits: outfits.map(outfitToDTO),
    };
  },

  async list(userId: string, page: number, limit: number) {
    const where = { userId };
    const [items, total] = await Promise.all([
      prisma.outfit.findMany({
        where,
        include: outfitInclude,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.outfit.count({ where }),
    ]);

    return {
      items: items.map(outfitToDTO),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  },

  async getById(userId: string, id: string) {
    const outfit = await prisma.outfit.findUnique({ where: { id }, include: outfitInclude });
    if (!outfit || outfit.userId !== userId) {
      throw AppError.notFound("Outfit not found");
    }
    return outfitToDTO(outfit);
  },

  async delete(userId: string, id: string) {
    const outfit = await prisma.outfit.findUnique({ where: { id } });
    if (!outfit || outfit.userId !== userId) {
      throw AppError.notFound("Outfit not found");
    }
    // OutfitItem and OutfitFeedback rows cascade-delete via schema relations.
    await prisma.outfit.delete({ where: { id } });
  },

  /**
   * Records a feedback event (LIKE/DISLIKE/SAVED/WORN) and returns the
   * outfit's updated DTO so the frontend can refresh its feedback summary
   * in one round trip. Append-only — see the OutfitFeedback schema comment
   * for why repeat/conflicting actions are both valid and expected.
   */
  async submitFeedback(userId: string, outfitId: string, action: OutfitFeedbackAction) {
    const outfit = await prisma.outfit.findUnique({ where: { id: outfitId } });
    if (!outfit || outfit.userId !== userId) {
      throw AppError.notFound("Outfit not found");
    }

    await prisma.outfitFeedback.create({ data: { userId, outfitId, action } });
    return this.getById(userId, outfitId);
  },
};
