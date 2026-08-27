import { ClothingCategories } from "@fashion-platform/shared";
import type { ClothingCategory } from "@fashion-platform/shared";
import { OUTFIT_OCCASION_TO_GARMENT_OCCASIONS, InsufficientWardrobeError } from "./outfit.types";
import type {
  GenerateOutfitsInput,
  OutfitCandidate,
  RecommendationEngine,
  StyleProfileInput,
  WardrobeItemInput,
} from "./outfit.types";

const NEUTRAL_COLORS = new Set([
  "black",
  "white",
  "grey",
  "gray",
  "navy",
  "beige",
  "camel",
  "cream",
  "ivory",
  "charcoal",
]);

const COLD_SEASONS = new Set(["autumn", "winter"]);
const WARM_SEASONS = new Set(["summer"]);

// A style is considered part of the user's identity (worth mentioning in
// explanations, worth scoring toward) once it accounts for a meaningful
// share of their profile — an 8% sliver isn't "their style", it's noise.
const STYLE_PROFILE_RELEVANCE_THRESHOLD_PCT = 15;

interface ScoredItem {
  item: WardrobeItemInput;
  score: number;
}

function effectiveStyle(item: WardrobeItemInput): string {
  return (item.aiMetadata?.style ?? item.style ?? "versatile").toLowerCase();
}

function scoreItemForOccasion(
  item: WardrobeItemInput,
  targetGarmentOccasions: string[],
  weatherBias: "cold" | "warm" | "neutral",
  styleProfile: StyleProfileInput | null | undefined,
  feedbackScore: number
): number {
  let score = 1; // baseline — every item is eligible even with no AI data yet

  if (item.aiMetadata) {
    const occasionMatch = item.aiMetadata.occasionSuitability.some((o) => targetGarmentOccasions.includes(o));
    if (occasionMatch) score += 2;

    // AI-detected confidence contributes a little — a low-confidence
    // analysis shouldn't drive the outfit as hard as a clear one.
    score += item.aiMetadata.confidence * 0.5;
  }

  if (weatherBias === "cold" && COLD_SEASONS.has(item.season)) score += 1;
  if (weatherBias === "warm" && WARM_SEASONS.has(item.season)) score += 1;
  if (item.season === "all_season") score += 0.5;

  // Style DNA bias: an item whose style matches the user's dominant
  // profile style, or whose color is one of their profile favourites,
  // scores higher — this is what makes generated outfits feel like *their*
  // taste rather than a generic occasion-appropriate combination.
  if (styleProfile) {
    const style = effectiveStyle(item);
    const stylePct = styleProfile.stylePercentages[style] ?? 0;
    if (stylePct >= STYLE_PROFILE_RELEVANCE_THRESHOLD_PCT) {
      score += Math.min(stylePct / 100, 0.4) * 2; // up to +0.8 for a strongly dominant style match
    }
    if (styleProfile.favouriteColors.includes(item.color.toLowerCase())) {
      score += 0.5;
    }
  }

  // Learned feedback: items that have appeared in outfits the user liked
  // or actually wore score higher; ones from disliked outfits score lower.
  // Clamped so one very-liked item can't single-handedly dominate a whole
  // outfit's selection regardless of occasion/season fit.
  score += Math.max(Math.min(feedbackScore * 0.3, 1), -1);

  return score;
}

function pickTopN(items: ScoredItem[], n: number): ScoredItem[] {
  return [...items].sort((a, b) => b.score - a.score).slice(0, n);
}

function colorHarmonyBonus(colors: string[]): number {
  const distinctAccents = new Set(colors.map((c) => c.toLowerCase()).filter((c) => !NEUTRAL_COLORS.has(c)));
  if (distinctAccents.size <= 1) return 0.15;
  if (distinctAccents.size === 2) return 0.08;
  return 0;
}

function buildReasoning(
  chosen: WardrobeItemInput[],
  styleProfile: StyleProfileInput | null | undefined,
  hasPositiveFeedbackHistory: boolean
): string {
  const order: ClothingCategory[] = ["outerwear", "dress", "top", "bottom", "footwear", "accessory", "other"];
  const sorted = [...chosen].sort((a, b) => order.indexOf(a.category) - order.indexOf(b.category));

  const parts = sorted.map((item) => `a ${item.color} ${item.category}`);
  const colors = new Set(chosen.map((c) => c.color.toLowerCase()));
  const colorNote =
    colors.size <= 2
      ? "The tight, coordinated palette keeps the whole look cohesive."
      : "The mix of tones is balanced by keeping silhouettes simple.";

  let sentence = `This outfit pairs ${parts.join(", ")}. ${colorNote}`;

  if (styleProfile) {
    const usesFavoriteColor = [...colors].some((c) => styleProfile.favouriteColors.includes(c));
    if (usesFavoriteColor) {
      sentence += ` It also leans on colors from your favorites (${styleProfile.favouriteColors.slice(0, 3).join(", ")}).`;
    }
  }

  if (hasPositiveFeedbackHistory) {
    sentence += " You've responded well to pieces like these before.";
  }

  return sentence;
}

function buildStyleExplanation(
  chosen: WardrobeItemInput[],
  occasion: string,
  styleProfile: StyleProfileInput | null | undefined
): string {
  const styleCounts = new Map<string, number>();
  for (const item of chosen) {
    const style = effectiveStyle(item);
    styleCounts.set(style, (styleCounts.get(style) ?? 0) + 1);
  }
  const dominantStyleInOutfit = [...styleCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "versatile";

  const base = `Rooted in a ${dominantStyleInOutfit} sensibility, this combination is well suited for a ${occasion} setting without feeling overdressed or underdressed for it.`;

  if (styleProfile) {
    const profilePct = styleProfile.stylePercentages[dominantStyleInOutfit];
    if (dominantStyleInOutfit === styleProfile.dominantStyle.toLowerCase() && profilePct !== undefined) {
      return `${base} This matches your style DNA closely — ${dominantStyleInOutfit} pieces make up ${profilePct}% of your wardrobe identity, so this outfit reads as authentically you rather than a generic ${occasion} look.`;
    }
  }

  return base;
}

/**
 * Rule-based, deterministic-given-its-inputs recommendation engine. No ML
 * model is involved — this reasons over structured data already produced
 * by the AI clothing analysis phase (category, color, occasionSuitability,
 * seasonSuitability, style), the user's Style DNA profile when one exists,
 * and their accumulated outfit feedback, using explicit heuristics rather
 * than a learned model. Every one of these signals is optional except the
 * wardrobe itself and the occasion — a brand-new user with no style
 * profile and no feedback history still gets outfits, just based on fewer
 * signals.
 *
 * This is intentionally built behind the same `RecommendationEngine`
 * interface a real ML-ranked engine would implement later — swapping this
 * out means writing one new class and changing one import in
 * outfit.service.ts, not redesigning the pipeline.
 */
export class RuleBasedRecommendationEngine implements RecommendationEngine {
  async generate(input: GenerateOutfitsInput): Promise<OutfitCandidate[]> {
    const targetGarmentOccasions = OUTFIT_OCCASION_TO_GARMENT_OCCASIONS[input.occasion];
    const feedbackScores = input.itemFeedbackScores ?? {};

    const weatherBias: "cold" | "warm" | "neutral" =
      input.weather?.condition === "cold" ||
      input.weather?.condition === "snowy" ||
      (input.weather?.temperatureC ?? 99) < 10
        ? "cold"
        : input.weather?.condition === "hot" || (input.weather?.temperatureC ?? -99) > 25
          ? "warm"
          : "neutral";

    const scored: ScoredItem[] = input.wardrobe.map((item) => ({
      item,
      score: scoreItemForOccasion(
        item,
        targetGarmentOccasions,
        weatherBias,
        input.styleProfile,
        feedbackScores[item.id] ?? 0
      ),
    }));

    const bySlot = new Map<ClothingCategory, ScoredItem[]>();
    for (const category of ClothingCategories) bySlot.set(category, []);
    for (const entry of scored) bySlot.get(entry.item.category)?.push(entry);

    const dresses = pickTopN(bySlot.get("dress") ?? [], 3);
    const tops = pickTopN(bySlot.get("top") ?? [], 3);
    const bottoms = pickTopN(bySlot.get("bottom") ?? [], 3);
    const footwear = pickTopN(bySlot.get("footwear") ?? [], 3);
    const outerwear = pickTopN(bySlot.get("outerwear") ?? [], 2);
    const accessories = pickTopN(bySlot.get("accessory") ?? [], 2);

    const canUseDressBase = dresses.length > 0;
    const canUseTopBottomBase = tops.length > 0 && bottoms.length > 0;

    if (!canUseDressBase && !canUseTopBottomBase) {
      throw new InsufficientWardrobeError(
        "Not enough wardrobe items to build an outfit yet — add at least a top and bottom (or a dress) to get started."
      );
    }
    if (footwear.length === 0) {
      throw new InsufficientWardrobeError(
        "Add at least one pair of footwear to your wardrobe to generate outfits."
      );
    }

    const candidates: OutfitCandidate[] = [];
    const seenCombinations = new Set<string>();

    // Build a handful of base combinations, dress-based and top+bottom-based,
    // crossed with footwear/outerwear/accessory options — capped so this
    // stays a small, bounded loop (at most a few dozen iterations) rather
    // than a combinatorial explosion, even with a large wardrobe.
    const bases: { core: ScoredItem[] }[] = [];
    if (canUseDressBase) {
      for (const dress of dresses) bases.push({ core: [dress] });
    }
    if (canUseTopBottomBase) {
      for (const top of tops) {
        for (const bottom of bottoms) {
          bases.push({ core: [top, bottom] });
        }
      }
    }

    for (const base of bases) {
      for (const shoe of footwear) {
        const includeOuterwear = weatherBias === "cold" && outerwear.length > 0;
        const outerwearOptions: (ScoredItem | null)[] = includeOuterwear ? outerwear : [null];

        for (const outer of outerwearOptions) {
          const accessoryOptions: (ScoredItem | null)[] = accessories.length > 0 ? [null, accessories[0]] : [null];

          for (const accessory of accessoryOptions) {
            const chosenEntries = [...base.core, shoe, outer, accessory].filter(
              (e): e is ScoredItem => e !== null
            );
            const chosenItems = chosenEntries.map((e) => e.item);

            const key = chosenItems
              .map((i) => i.id)
              .sort()
              .join(",");
            if (seenCombinations.has(key)) continue;
            seenCombinations.add(key);

            const occasionScoreSum = chosenEntries.reduce((sum, e) => sum + e.score, 0);
            const maxPossible = chosenEntries.length * 4.7; // rough ceiling per item across all scoring factors
            const occasionRatio = Math.min(Math.max(occasionScoreSum / maxPossible, 0), 1);

            const harmony = colorHarmonyBonus(chosenItems.map((i) => i.color));

            const confidence = Math.min(0.55 + occasionRatio * 0.3 + harmony, 0.97);

            const hasPositiveFeedbackHistory = chosenItems.some((i) => (feedbackScores[i.id] ?? 0) > 0);

            candidates.push({
              items: chosenItems.map((i) => ({ clothingItemId: i.id, role: i.category })),
              occasion: input.occasion,
              reasoning: buildReasoning(chosenItems, input.styleProfile, hasPositiveFeedbackHistory),
              styleExplanation: buildStyleExplanation(chosenItems, input.occasion, input.styleProfile),
              confidence: Math.round(confidence * 100) / 100,
            });
          }
        }
      }
    }

    // Highest-confidence candidates first, capped to a manageable number of
    // options — nobody wants to scroll through dozens of near-duplicate outfits.
    return candidates.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  }
}

export const recommendationEngine = new RuleBasedRecommendationEngine();
