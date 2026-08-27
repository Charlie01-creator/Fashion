import { prisma } from "../config/database";
import { AppError } from "../utils/AppError";
import { storageProvider } from "./storage";
import { clothingAnalyzer } from "./ai";
import { analysisQueue } from "./queue";
import { logger } from "../config/logger";
import { isProduction } from "../config/env";
import type { CreateClothingItemInput, ListClothingQuery } from "../validators/clothing.validator";
import type { AiAnalysisStatus, ClothingCategory, ClothingSeason } from "@fashion-platform/shared";

const MAX_ERROR_MESSAGE_LENGTH = 300;

function toDTO(item: {
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
}) {
  return {
    id: item.id,
    userId: item.userId,
    imageUrl: item.imageUrl,
    category: item.category as ClothingCategory,
    color: item.color,
    style: item.style,
    season: item.season as ClothingSeason,
    tags: item.tags,
    aiMetadata: item.aiMetadata as any,
    aiStatus: item.aiStatus as AiAnalysisStatus,
    aiErrorMessage: item.aiErrorMessage,
    aiAnalyzedAt: item.aiAnalyzedAt ? item.aiAnalyzedAt.toISOString() : null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

export const clothingService = {
  async create(userId: string, input: CreateClothingItemInput) {
    const item = await prisma.clothingItem.create({
      data: {
        userId,
        imageUrl: input.imageUrl,
        imageKey: input.imageKey,
        category: input.category,
        color: input.color,
        style: input.style,
        season: input.season,
        tags: input.tags ?? [],
        aiStatus: "PENDING",
      },
    });

    // Queue analysis rather than run it inline. enqueue() itself resolves
    // fast (it just schedules the job) — the HTTP response is not delayed
    // by AI processing time, whether that's the mock's ~600ms or a real
    // vision API's several seconds. See services/queue/ for what "queue"
    // means today vs. the production upgrade path.
    await analysisQueue.enqueue({ itemId: item.id, userId });

    return toDTO(item);
  },

  async list(userId: string, query: ListClothingQuery) {
    const where = {
      userId, // every query is scoped to the requesting user — this is the ownership boundary
      ...(query.category ? { category: query.category } : {}),
    };

    const [items, total] = await Promise.all([
      prisma.clothingItem.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.clothingItem.count({ where }),
    ]);

    return {
      items: items.map(toDTO),
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  },

  async getById(userId: string, id: string) {
    const item = await prisma.clothingItem.findUnique({ where: { id } });

    // Return 404 (not 403) for items owned by someone else — this avoids
    // confirming to a caller that a given item ID exists at all, which is
    // a minor but real information leak.
    if (!item || item.userId !== userId) {
      throw AppError.notFound("Clothing item not found");
    }

    return toDTO(item);
  },

  /**
   * Runs AI analysis for one item and persists the outcome. This is the
   * queue's registered processor (see bottom of this file) AND what the
   * explicit retry endpoint calls directly — same code path either way, so
   * "queued analysis" and "manual retry" can never drift into different
   * behavior.
   *
   * Deliberately never throws for AI-call failures: it catches internally
   * and records aiStatus "FAILED" with a safe, user-facing aiErrorMessage.
   * It DOES throw AppError.notFound if the item doesn't exist / isn't
   * owned by this user — callers decide what to do with that (the queue
   * processor logs and swallows it; the retry endpoint lets it become a
   * normal 404 response, which is correct there since a human is waiting).
   */
  async analyzeItem(userId: string, id: string) {
    const item = await prisma.clothingItem.findUnique({ where: { id } });
    if (!item || item.userId !== userId) {
      throw AppError.notFound("Clothing item not found");
    }

    // Mark ANALYZING before the (possibly slow) provider call, so anyone
    // polling GET /clothing/:id sees "in progress" rather than a stale
    // "pending" for the whole duration of a multi-second vision API call.
    await prisma.clothingItem.update({
      where: { id },
      data: { aiStatus: "ANALYZING", aiErrorMessage: null },
    });

    try {
      const result = await clothingAnalyzer.analyze({ imageUrl: item.imageUrl });

      const updated = await prisma.clothingItem.update({
        where: { id },
        data: {
          aiMetadata: result as any,
          aiStatus: "COMPLETED",
          aiErrorMessage: null,
          aiAnalyzedAt: new Date(),
        },
      });
      return toDTO(updated);
    } catch (err) {
      const rawMessage = err instanceof Error ? err.message : String(err);
      logger.warn("AI analysis failed for clothing item", { itemId: id, error: rawMessage });

      // In production, don't surface raw provider error text to the client
      // (could contain internal details about the provider integration) —
      // a generic, actionable message is enough; full detail is in the logs.
      const userFacingMessage = isProduction
        ? "AI analysis couldn't complete. You can retry."
        : rawMessage.slice(0, MAX_ERROR_MESSAGE_LENGTH);

      const updated = await prisma.clothingItem.update({
        where: { id },
        data: { aiStatus: "FAILED", aiMetadata: null, aiErrorMessage: userFacingMessage },
      });
      return toDTO(updated);
    }
  },

  async delete(userId: string, id: string) {
    const item = await prisma.clothingItem.findUnique({ where: { id } });
    if (!item || item.userId !== userId) {
      throw AppError.notFound("Clothing item not found");
    }

    // Delete the DB row first: if storage delete fails, we don't want to
    // resurrect a "deleted" item, and an orphaned file is a cheap, safe
    // failure mode (cleanable later) vs. an orphaned DB row pointing at
    // nothing. Log so orphans are discoverable, don't fail the request.
    await prisma.clothingItem.delete({ where: { id } });

    try {
      await storageProvider.delete(item.imageKey);
    } catch (err) {
      // Don't fail the request over this — the user-facing delete already
      // succeeded and an orphaned file is a cheap, recoverable failure mode.
      // Logged so orphans are discoverable; a background reconciliation job
      // is the right place to sweep these up at scale, not needed yet.
      logger.warn("Failed to delete storage file for removed clothing item", {
        itemId: id,
        imageKey: item.imageKey,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },
};

// Wire the queue's processor here, in the same file that defines
// analyzeItem, rather than in queue/index.ts — that keeps the dependency
// direction one-way (clothing.service -> queue) and avoids a circular
// import that would otherwise exist if the queue module imported
// clothingService directly.
analysisQueue.setProcessor(({ itemId, userId }) => clothingService.analyzeItem(userId, itemId).then(() => {}));
