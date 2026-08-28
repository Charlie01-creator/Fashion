import type { ClothingAnalyzer } from "./ai.types";
import { MockProvider } from "./providers/mockProvider";
import { VisionProvider } from "./providers/visionProvider";
import { env } from "../../config/env";

/**
 * Single point of truth for "which AI provider are we using". Callers
 * import `clothingAnalyzer` from here and never instantiate a concrete
 * provider class directly — this is what makes the AI service replaceable
 * without touching clothingService, controllers, or routes.
 *
 * Defaults to the mock provider so the app works fully offline / without
 * API keys during development. Set AI_PROVIDER=openai_vision and
 * OPENAI_API_KEY to use the real integration — see providers/visionProvider.ts
 * for its deployment constraints (public image URLs required).
 */
function createAnalyzer(): ClothingAnalyzer {
  switch (env.AI_PROVIDER) {
    case "mock":
      return new MockProvider();
    case "openai_vision":
      return new VisionProvider();
    default:
      throw new Error(`Unknown AI_PROVIDER: ${env.AI_PROVIDER}`);
  }
}

export const clothingAnalyzer = createAnalyzer();
export type { ClothingAnalyzer, ClothingAnalysisInput, ClothingAnalysisResult } from "./ai.types";
