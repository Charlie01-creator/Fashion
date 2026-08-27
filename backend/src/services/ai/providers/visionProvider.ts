import { ClothingCategories, ClothingOccasions, ClothingSeasons } from "@fashion-platform/shared";
import { clothingAnalysisResultSchema } from "../ai.types";
import type { ClothingAnalysisInput, ClothingAnalysisResult, ClothingAnalyzer } from "../ai.types";
import { env } from "../../../config/env";

const SYSTEM_PROMPT = `You are a clothing analysis system for a fashion wardrobe app. You will be shown one photo of a single clothing item. Analyze it and respond with ONLY a JSON object — no prose, no markdown fences, no explanation before or after — matching exactly this shape:

{
  "category": one of ${JSON.stringify(ClothingCategories)},
  "color": string, the single dominant color in plain English (e.g. "navy", "charcoal"),
  "style": string, a short style descriptor (e.g. "minimalist", "streetwear", "tailored"),
  "pattern": string, e.g. "solid", "striped", "checked", "floral", "printed",
  "material": string, your best visual estimate of the primary fabric (e.g. "cotton", "denim", "wool") — mark clearly uncertain guesses by prefixing with "likely ",
  "seasonSuitability": array of 1-3 values from ${JSON.stringify(ClothingSeasons)},
  "occasionSuitability": array of 1-3 values from ${JSON.stringify(ClothingOccasions)},
  "tags": array of up to 6 short descriptive tags,
  "confidence": number between 0 and 1 representing your overall confidence in this analysis
}

If the image does not clearly show a single wearable clothing item, still return your best-effort JSON with a low confidence value rather than refusing — the calling application handles low confidence, not empty responses.`;

/**
 * Real AI vision integration, using an OpenAI-compatible chat completions
 * endpoint with image input and JSON-mode output. Activate with
 * AI_PROVIDER=openai_vision and a valid OPENAI_API_KEY.
 *
 * IMPORTANT — this has NOT been exercised against a live API in this
 * environment (no network egress / no API key available where this was
 * built). The request/response handling, prompt, and validation are
 * written to the current OpenAI API contract as of this codebase's
 * training, but you should smoke-test this against a real key and a
 * real image before relying on it — API shapes and model names do drift.
 *
 * IMPORTANT — deployment constraint: the API needs to fetch the image from
 * `imageUrl`, so that URL must be genuinely internet-reachable from
 * OpenAI's servers. A localhost URL (what LocalStorageProvider produces in
 * dev) will NOT work here — this provider is only viable once the storage
 * layer is backed by real public/CDN URLs (S3, etc.). See docs/ARCHITECTURE.md.
 */
export class VisionProvider implements ClothingAnalyzer {
  async analyze(input: ClothingAnalysisInput): Promise<ClothingAnalysisResult> {
    if (!env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured — cannot use the vision provider");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), env.AI_REQUEST_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: env.OPENAI_VISION_MODEL,
          response_format: { type: "json_object" },
          max_tokens: 500,
          temperature: 0.2,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                { type: "text", text: "Analyze this clothing item." },
                { type: "image_url", image_url: { url: input.imageUrl } },
              ],
            },
          ],
        }),
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error(`Vision provider request timed out after ${env.AI_REQUEST_TIMEOUT_MS}ms`);
      }
      throw new Error(`Vision provider request failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      // Don't leak the raw provider error body (could contain account/billing
      // details) into logs at this layer — status code is enough context
      // here; callers already log full error detail at the point they catch this.
      throw new Error(`Vision provider returned HTTP ${response.status}`);
    }

    const payload = await response.json();
    const rawContent = payload?.choices?.[0]?.message?.content;
    if (typeof rawContent !== "string") {
      throw new Error("Vision provider response missing expected content");
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawContent);
    } catch {
      throw new Error("Vision provider returned non-JSON content");
    }

    // Validate against the same schema the mock provider's output implicitly
    // satisfies — this is what keeps a malformed or hallucinated field from
    // a live model from ever reaching the database.
    const validated = clothingAnalysisResultSchema.safeParse(parsedJson);
    if (!validated.success) {
      throw new Error(`Vision provider returned data that failed validation: ${validated.error.message}`);
    }

    return validated.data;
  }
}
