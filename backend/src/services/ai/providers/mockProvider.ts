import { ClothingCategories, ClothingOccasions, ClothingSeasons } from "@fashion-platform/shared";
import type { ClothingAnalysisInput, ClothingAnalysisResult, ClothingAnalyzer } from "../ai.types";
import { env } from "../../../config/env";

const MOCK_COLORS = ["black", "white", "navy", "beige", "olive", "burgundy", "grey", "camel"];
const MOCK_STYLES = ["minimalist", "streetwear", "tailored", "casual", "bohemian", "sporty"];
const MOCK_PATTERNS = ["solid", "striped", "checked", "floral", "houndstooth", "printed"];
const MOCK_MATERIALS = ["cotton", "wool", "linen", "polyester", "denim", "leather", "silk"];
const MOCK_TAG_POOL = ["structured", "relaxed fit", "layering piece", "statement", "everyday", "lightweight"];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickSome<T>(arr: readonly T[], min: number, max: number): T[] {
  const count = min + Math.floor(Math.random() * (max - min + 1));
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Stands in for a real vision-model call — see visionProvider.ts for that.
 * Simulates realistic latency and an occasional failure so the
 * pending -> analyzing -> failed -> retry path actually gets exercised in
 * dev, not just the happy path.
 *
 * This does NOT look at the image at all — it has no way to — so results
 * are random. Don't mistake "the pipeline works end to end" for "the
 * results are meaningful"; that only becomes true with a real provider.
 * This is the default (AI_PROVIDER=mock) precisely so the app works fully
 * offline / without API keys during development.
 */
export class MockProvider implements ClothingAnalyzer {
  async analyze(_input: ClothingAnalysisInput): Promise<ClothingAnalysisResult> {
    await this.simulateLatency();

    if (Math.random() < env.AI_MOCK_FAILURE_RATE) {
      throw new Error("Mock provider simulated failure");
    }

    return {
      category: pick(ClothingCategories),
      color: pick(MOCK_COLORS),
      style: pick(MOCK_STYLES),
      pattern: pick(MOCK_PATTERNS),
      material: pick(MOCK_MATERIALS),
      seasonSuitability: pickSome(ClothingSeasons, 1, 3),
      occasionSuitability: pickSome(ClothingOccasions, 1, 3),
      tags: pickSome(MOCK_TAG_POOL, 1, 3),
      confidence: Math.round((0.6 + Math.random() * 0.35) * 100) / 100,
    };
  }

  private simulateLatency(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, env.AI_MOCK_LATENCY_MS));
  }
}
