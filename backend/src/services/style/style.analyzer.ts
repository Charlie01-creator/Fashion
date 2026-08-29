import type {
  ExplicitPreferencesInput,
  OutfitHistoryEntry,
  StyleAnalysisInput,
  StyleAnalyzer,
  StyleProfileData,
  WardrobeItemForStyle,
} from "./style.types";

const PREFERRED_STYLE_BONUS = 3;
const DISLIKED_STYLE_PENALTY = 3;
const FAVORITE_COLOR_BONUS = 2;

function effectiveStyle(item: { style: string | null; aiMetadata?: { style: string } | null }): string {
  return (item.aiMetadata?.style ?? item.style ?? "versatile").toLowerCase();
}

/**
 * WORN counts most (a real, repeated real-world choice), LIKE is a mild
 * positive signal, DISLIKE a mild negative one. Floored at 0 — a disliked
 * outfit never actively subtracts from other outfits' tallies, it just
 * stops contributing to its own items' weight.
 */
function outfitWeight(feedbackActions: string[]): number {
  let weight = 1; // every past outfit counts at least once, even with no feedback yet
  for (const action of feedbackActions) {
    if (action === "WORN") weight += 1.5;
    else if (action === "LIKE") weight += 1;
    else if (action === "DISLIKE") weight -= 1;
  }
  return Math.max(weight, 0);
}

function tallyStylesAndColors(
  wardrobe: WardrobeItemForStyle[],
  outfitHistory: OutfitHistoryEntry[]
): { styleTally: Map<string, number>; colorTally: Map<string, number>; categoryTally: Map<string, number> } {
  const styleTally = new Map<string, number>();
  const colorTally = new Map<string, number>();
  const categoryTally = new Map<string, number>();

  const add = (map: Map<string, number>, key: string, weight: number) => {
    map.set(key, (map.get(key) ?? 0) + weight);
  };

  for (const item of wardrobe) {
    add(styleTally, effectiveStyle(item), 1);
    add(colorTally, item.color.toLowerCase(), 1);
    add(categoryTally, item.category, 1);
  }

  for (const outfit of outfitHistory) {
    const weight = outfitWeight(outfit.feedbackActions);
    if (weight === 0) continue;
    for (const item of outfit.items) {
      add(styleTally, effectiveStyle(item), weight);
      add(colorTally, item.color.toLowerCase(), weight);
      add(categoryTally, item.category, weight);
    }
  }

  return { styleTally, colorTally, categoryTally };
}

function topEntries(tally: Map<string, number>, n: number): string[] {
  return [...tally.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key]) => key);
}

function buildImprovements(params: {
  wardrobe: WardrobeItemForStyle[];
  dominantStyle: string;
  dominantSharePct: number;
  explicitPreferences: ExplicitPreferencesInput | null;
  feedbackCount: number;
  analyzedRatio: number;
}): string[] {
  const improvements: string[] = [];
  const categories = new Set(params.wardrobe.map((i) => i.category));

  if (!categories.has("outerwear")) {
    improvements.push(
      "Your wardrobe has no outerwear yet — adding a jacket or coat rounds out cooler-weather outfits."
    );
  }
  if (!categories.has("footwear")) {
    improvements.push("Add at least one pair of shoes so the stylist can complete full outfits for you.");
  }
  if (params.dominantSharePct >= 75) {
    improvements.push(
      `Your wardrobe leans heavily ${params.dominantStyle} (${params.dominantSharePct}%) — one contrasting piece could add versatility for occasions that call for a different mood.`
    );
  }
  if (params.explicitPreferences?.dislikedStyles.some((s) => s.toLowerCase() === params.dominantStyle.toLowerCase())) {
    improvements.push(
      `You've noted you dislike ${params.dominantStyle} style, but it's currently dominant in your wardrobe — worth reviewing whether recent pieces still match your taste.`
    );
  }
  if (params.analyzedRatio < 0.5) {
    improvements.push(
      "Several of your pieces haven't finished AI analysis yet — check back once they complete for a sharper profile."
    );
  }
  if (params.feedbackCount < 3) {
    improvements.push(
      "Like, dislike, or mark outfits as worn from the AI Stylist — every reaction helps your recommendations improve faster."
    );
  }

  return improvements.slice(0, 4); // keep the report focused, not a wall of caveats
}

/**
 * Rule-based Style DNA analyzer — no ML model involved. It reasons over
 * weighted frequency counts: every wardrobe item counts once, every past
 * outfit counts again (more heavily if the user marked it WORN or LIKEd
 * it, less if DISLIKEd), and explicit stated preferences apply a modest
 * nudge on top. This is deliberately readable and debuggable — you can
 * trace exactly why a profile came out the way it did — at the cost of
 * being less nuanced than a real embedding-based style model would be.
 */
export class RuleBasedStyleAnalyzer implements StyleAnalyzer {
  // This implementation does no I/O and could be fully synchronous, but the
  // interface is async on purpose — a future ML-based analyzer would need
  // to make a real network call, and this keeps that swap a drop-in
  // replacement rather than an interface change that ripples into
  // style.service.ts.
  async analyze(input: StyleAnalysisInput): Promise<StyleProfileData> {
    const { styleTally, colorTally, categoryTally } = tallyStylesAndColors(input.wardrobe, input.outfitHistory);

    if (input.explicitPreferences) {
      for (const style of input.explicitPreferences.preferredStyles) {
        const key = style.toLowerCase();
        styleTally.set(key, (styleTally.get(key) ?? 0) + PREFERRED_STYLE_BONUS);
      }
      for (const style of input.explicitPreferences.dislikedStyles) {
        const key = style.toLowerCase();
        if (styleTally.has(key)) {
          styleTally.set(key, Math.max(styleTally.get(key)! - DISLIKED_STYLE_PENALTY, 0));
        }
      }
      for (const color of input.explicitPreferences.favoriteColors) {
        const key = color.toLowerCase();
        colorTally.set(key, (colorTally.get(key) ?? 0) + FAVORITE_COLOR_BONUS);
      }
    }

    const styleTotal = [...styleTally.values()].reduce((a, b) => a + b, 0) || 1;
    const stylePercentages: Record<string, number> = {};
    for (const [style, weight] of styleTally.entries()) {
      stylePercentages[style] = Math.round((weight / styleTotal) * 100);
    }

    const dominantStyle = topEntries(styleTally, 1)[0] ?? "versatile";
    const dominantSharePct = stylePercentages[dominantStyle] ?? 0;

    const favouriteColors = topEntries(colorTally, 3);
    const preferredCategories = topEntries(categoryTally, 4);

    const analyzedCount = input.wardrobe.filter((i) => i.aiMetadata !== null).length;
    const analyzedRatio = input.wardrobe.length > 0 ? analyzedCount / input.wardrobe.length : 0;
    const feedbackCount = input.outfitHistory.reduce((sum, o) => sum + o.feedbackActions.length, 0);

    // Confidence grows with data volume across three independent signals —
    // wardrobe size/analysis completeness, outfit history depth, and
    // feedback volume — rather than any single one, so a user who has
    // uploaded a lot but never reacted to an outfit still gets a moderate
    // (not maxed-out) confidence score.
    const wardrobeSignal = Math.min(input.wardrobe.length / 10, 1) * 0.3 * (0.5 + analyzedRatio * 0.5);
    const historySignal = Math.min(input.outfitHistory.length / 10, 1) * 0.25;
    const feedbackSignal = Math.min(feedbackCount / 10, 1) * 0.15;
    const confidenceScore =
      Math.round(Math.min(0.3 + wardrobeSignal + historySignal + feedbackSignal, 0.97) * 100) / 100;

    const recommendedImprovements = buildImprovements({
      wardrobe: input.wardrobe,
      dominantStyle,
      dominantSharePct,
      explicitPreferences: input.explicitPreferences,
      feedbackCount,
      analyzedRatio,
    });

    return {
      dominantStyle,
      stylePercentages,
      favouriteColors,
      preferredCategories,
      recommendedImprovements,
      confidenceScore,
    };
  }
}

export const styleAnalyzer = new RuleBasedStyleAnalyzer();
