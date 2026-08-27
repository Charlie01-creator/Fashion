# Architecture

## Why a monorepo with a shared package

`shared/` holds every type that crosses the frontend/backend boundary (`User`, `ApiResponse`, request DTOs). Both apps import from it. Without this, the two codebases drift silently — the backend renames a field, the frontend doesn't know until runtime. This is the single highest-leverage decision in this scaffold for a team that's about to grow.

## Request flow

```
Browser → Next.js (SSR/CSR) → fetch() → Express API → service layer → Prisma → PostgreSQL
```

Controllers are intentionally thin (`asyncHandler` + call a service + shape the response). Business logic lives in `services/`. This split is what keeps things maintainable once "AI stylist" logic, external vision-model calls, and marketplace transactions start landing in the same codebase — you do not want that logic tangled into Express request/response handling.

## Auth model

- **Access token**: short-lived JWT (15 min default), returned in the JSON body, kept in memory on the client (a JS variable, not localStorage/sessionStorage). Never persisted — an XSS payload that runs JS can still steal it while it's live, but it can't harvest it from storage after the fact, and it expires fast.
- **Refresh token**: opaque random token, stored **hashed** in Postgres (`RefreshToken` table), delivered to the browser as an `httpOnly`, `sameSite=lax`, `secure` (in prod) cookie scoped to `/api/auth`. Rotated on every use — a stolen refresh token becomes useless the moment the legitimate user refreshes once, and you can revoke a session server-side (logout, "sign out everywhere", suspicious activity).
- Trade-off you're accepting: refresh happens via a real network round trip on every page load (to rehydrate the in-memory access token), which is slightly slower than reading a token from localStorage. This is the correct trade for security; do not "fix" it by moving the access token into storage.

## Cross-origin cookie constraint — how it's actually handled (read before deploying)

**Update:** this section originally described the problem but slightly understated it, and recommended fixes that were never implemented in code. Both are now corrected below; see `DEPLOYMENT.md` for the full production setup.

The `refreshToken` httpOnly cookie is set by the Express backend and scoped (by the browser) to the backend's own origin. When `frontend` (Vercel) and `backend` (Render/Railway) are deployed on different domains — the default shape for this stack — two independent things break, not one:

1. **The cookie never reaches the Next.js server.** `middleware.ts` runs on the frontend's own domain and will never see a cookie scoped to the backend's domain, for any user, ever. (This was correctly described before.)
2. **The cookie may never reach the *backend* either, on cross-site `fetch()` calls, if `SameSite=Lax`.** This is the part the original write-up got wrong — it claimed "the AuthProvider's fetch call still works... because that request targets the backend directly." It doesn't: `SameSite=Lax` cookies are only sent by the browser on top-level navigations across sites, not on `fetch()`/`XHR` subresource requests, regardless of `credentials: "include"` or CORS `Access-Control-Allow-Credentials`. So with the original `sameSite: "lax"`, cross-origin deployments would see login succeed (the cookie gets *set* fine) and then the very next silent-refresh-on-reload call would send no cookie at all — session persistence silently broken, no error thrown anywhere.

**What's actually implemented now:**

- `COOKIE_SAMESITE` is an environment variable (`backend/src/config/env.ts`, default `"lax"`). Set it to `none` in any deployment where frontend and backend are on different domains. `secure` is force-derived to `true` whenever `sameSite=none` (browsers ignore `SameSite=None` cookies that aren't `Secure`, so there's no valid config where these disagree — see `cookieConfig` in `env.ts`).
- `middleware.ts`'s cookie-presence check has been removed (see the comment left in that file). It doesn't degrade gracefully cross-origin — it fails *hard*, redirecting every visitor (including ones with a valid session) to `/login` on every direct load of a protected route, because the cookie can never reach that server. The client-side guard in `(dashboard)/layout.tsx` (which calls `/api/auth/refresh` — a legitimate cross-origin fetch to the backend's own domain, which does work once `COOKIE_SAMESITE=none` is set) is the only redirect mechanism now. Trade-off: a brief loading state instead of an instant server-side redirect. This is not a security gap — the backend independently re-validates the access token on every protected API call regardless of either check.
- CORS (`app.ts`) validates the request's `Origin` header against `CLIENT_ORIGIN` (now a comma-separated allowlist, not a single URL) and reflects it back rather than using a static origin, which is required once you need more than one allowed frontend origin (e.g. a Vercel preview URL alongside production).
- `helmet`'s default `Cross-Origin-Resource-Policy: same-origin` was also blocking `/uploads` images from loading on the frontend's domain — relaxed to `cross-origin` in `app.ts`.

**Still true, unchanged:** do not "fix" any of this by making the cookie non-`httpOnly` or readable by JS — that reintroduces the XSS token-theft risk the `httpOnly` flag exists to prevent. If you'd rather avoid `SameSite=None` entirely, the same-site reverse-proxy approach (Next.js `rewrites()` proxying `/api/*` to the backend, both served from one domain) is still valid and lets you keep `sameSite: "lax"` — it's just a bigger infra change than flipping an env var, so it wasn't the default path taken here.

## AI service architecture

`backend/src/services/ai/` isolates all AI-provider-specific code behind one interface (`ClothingAnalyzer`, in `ai.types.ts`). Two implementations exist in `providers/`: `MockProvider` (default, no API key needed, works fully offline) and `VisionProvider` (a real OpenAI-compatible vision integration, activated via `AI_PROVIDER=openai_vision` + `OPENAI_API_KEY`). `clothingService` — and everything above it (controllers, routes) — only ever imports the `clothingAnalyzer` singleton from `services/ai/index.ts`, never a concrete provider class. Swapping providers means writing one new class and changing one line in the factory switch statement.

Both providers' output is validated against the same zod schema (`clothingAnalysisResultSchema` in `ai.types.ts`) before it's trusted anywhere else — this matters much more for the real provider than the mock, since a live model can return malformed JSON, a hallucinated enum value, or a missing field, and that should become a clean "analysis failed, retry" rather than bad data silently reaching the database.

**`VisionProvider` has not been exercised against a live API in this environment** (no network egress / no API key available where this was built). The request shape, prompt, and response parsing are written to the current OpenAI API contract, but treat this as "ready to smoke-test," not "verified working," until someone runs it against a real key and a real image.

**Deployment constraint worth knowing before flipping `AI_PROVIDER` to `openai_vision`:** the vision API needs to fetch the image itself from `imageUrl`, so that URL must be genuinely internet-reachable from OpenAI's servers. `LocalStorageProvider`'s `http://localhost:4000/...` URLs will NOT work here — the real vision provider is only viable once the storage layer is backed by a real public/CDN URL (S3, etc.). Don't enable the real provider and the local storage driver at the same time; the analysis will just fail for every item.

**Background job queue.** `services/queue/` is a second abstraction layer sitting between `clothingService` and the analyzer: `clothingService.create()` calls `analysisQueue.enqueue()`, never the analyzer directly. The only implementation right now, `InMemoryAnalysisQueue`, schedules the job on the same Node process via `setImmediate` — it is NOT durable (a restart between enqueue and execution silently loses the job, leaving the item at `PENDING` until someone manually retries) and does NOT coordinate across multiple backend instances. That's an honest, known limitation, not an oversight — the interface boundary is what this phase was asked to prepare, and the in-memory implementation is the simplest thing that satisfies it correctly for a single-instance deployment. Upgrading to BullMQ/SQS later means implementing `AnalysisQueue` against a real broker and moving the processor into a separate worker process; `clothingService` doesn't change.

**Status pipeline:** `PENDING` (queued, not started) → `ANALYZING` (provider call in flight — set *before* the potentially slow call, so polling clients see real progress instead of a static "pending" for several seconds) → `COMPLETED` (result in `aiMetadata`) or `FAILED` (`aiErrorMessage` set, `aiMetadata` stays null, retriable via `POST /clothing/:id/analyze`).

## Outfit recommendation engine

`backend/src/services/outfits/` mirrors the same replaceable-provider pattern used for storage and AI clothing analysis: `RecommendationEngine` (in `outfit.types.ts`) is the interface, `RuleBasedRecommendationEngine` (in `recommendation.engine.ts`) is the only implementation today, and `outfit.service.ts` only ever calls the exported `recommendationEngine` singleton — never the concrete class. A future ML-ranked engine is a new class behind the same interface, not a redesign.

**What "rule-based" actually means here:** there's no model call. The engine reasons over structured data the AI clothing-analysis phase already produced — each item's `category`, `color`, `occasionSuitability`, `seasonSuitability`, and `style` — using explicit, readable heuristics: match the requested occasion against each garment's AI-detected suitability, bias toward season-appropriate pieces when a weather condition is given, and score color combinations higher when they share fewer distinct accent colors. It degrades gracefully for items that haven't finished AI analysis yet (or failed) — they're still eligible, just without the occasion-match score boost, so a partially-analyzed wardrobe still produces outfits rather than excluding those items outright.

**No duplication of clothing data.** `Outfit` and `OutfitItem` store zero garment details — no color, no image URL, nothing copied from `ClothingItem`. `OutfitItem` is purely `{ outfitId, clothingItemId, role }`. Every outfit response is built by joining through to the live `ClothingItem` row, so if that item gets re-analyzed by AI later (new `aiMetadata`), every outfit referencing it reflects the update automatically — there's nothing to keep in sync, because nothing was ever copied.

**Known trade-off:** deleting a `ClothingItem` that's part of a saved outfit cascade-deletes that `OutfitItem` row (the slot silently disappears) rather than blocking the deletion or invalidating the whole outfit. This keeps the wardrobe delete flow simple and unblocked, at the cost of outfits potentially ending up with fewer items than when they were generated. A more complete version of this would flag the outfit as "incomplete" and prompt the user to swap in a replacement — not built this phase.

**Weather is structural, not functional.** `WeatherContext` flows end-to-end (frontend selector → API → engine), and the engine does use it (season bias toward warmer/cooler items) — but there's no real weather API call behind it; the user picks a condition manually. Wiring a real forecast API (given the user's location) is additive from here, not a redesign.

## Style DNA engine and the feedback loop

`backend/src/services/style/` follows the same pattern as storage, AI clothing analysis, and outfit recommendation: `StyleAnalyzer` (in `style.types.ts`) is the interface, `RuleBasedStyleAnalyzer` (in `style.analyzer.ts`) is the only implementation, `style.service.ts` calls the exported `styleAnalyzer` singleton, never the concrete class.

**What it computes, and from what.** The analyzer builds weighted frequency counts of style, color, and category across two sources: every wardrobe item (weight 1), and every past outfit (weight 1, boosted if the user marked it `WORN` — a real repeated choice counts more than a one-off — or `LIKE`d it, reduced toward zero if `DISLIKE`d, floored so a disliked outfit never actively subtracts from *other* outfits). Explicit `UserFashionPreference` entries apply a modest nudge on top — enough to acknowledge stated identity, not enough to override what the wardrobe and behavior actually show. The result is normalized into `stylePercentages`, plus `favouriteColors`/`preferredCategories` (top-N by weight) and a handful of rule-based `recommendedImprovements` (missing categories, an overly dominant style, low AI-analysis coverage, low feedback volume, or a stated dislike that contradicts the dominant style).

**Inferred vs. declared, kept separate on purpose.** `StyleProfile` (what the data says) and `UserFashionPreference` (what the user says about themselves) are two different models, not one merged into the other. This means a user's stated preference is never silently overwritten by an inferred one — both feed the recommendation engine as independent signals.

**Cached, not live-computed.** `StyleProfile` is a point-in-time snapshot, regenerated only via explicit `POST /style-profile/generate`, not recalculated on every `GET`. Recomputation touches the user's whole wardrobe and outfit history (bounded to the most recent 500 items / 100 outfits / 300 feedback events — see the constants in `style.service.ts`) — cheap for one user on demand, but not something that should happen implicitly on every profile page view.

**Closing the loop into outfit generation.** `outfit.service.ts` now fetches the cached `StyleProfile` (if one exists) and a per-item feedback score (via `styleService.getItemFeedbackScores`, shared rather than duplicated — see its docstring for why) and passes both into `recommendationEngine.generate()`. The engine uses them to bias item scoring (a style matching the user's dominant profile style, or a favourite color, scores higher; an item from liked/worn outfits scores higher, one from disliked outfits scores lower) and to write more specific explanation text when they're available (e.g. naming the exact percentage a style contributes to the user's profile). Every one of these signals is optional except the wardrobe and occasion themselves — a brand-new user with no style profile and no feedback history still gets outfits, just reasoned over fewer signals. Quality is therefore expected to visibly improve over a user's first few sessions as AI analysis completes, outfits get generated, and feedback accumulates — not something achieved instantly on day one.

**Feedback is an append-only event log, not a toggle.** `OutfitFeedback` never overwrites a previous row — a `WORN` outfit can be worn again (each wear is a separate, real signal), and a `LIKE` followed later by a `DISLIKE` on the same outfit is meaningful history, not a correction. "Current" sentiment shown in the UI (e.g. whether the like button is highlighted) is derived by reading the most recent `LIKE`/`DISLIKE` row per outfit at read time, not stored as a separate mutable flag that could drift from the log.

## Scalability seams already in place

- Prisma singleton with connection reuse in dev (`config/database.ts`) prevents pool exhaustion from hot-reload.
- Service layer means swapping Prisma for a different data layer per-domain (e.g. a vector DB for style embeddings) later doesn't touch controllers.
- `RefreshToken` table is indexed on `userId`; expect to add a cleanup job (cron/worker) that deletes expired/revoked rows once volume grows — nothing currently prunes this table.
- `UserActivity` (future model, commented in schema) is flagged as a candidate for a separate analytics store rather than Postgres, once write volume is meaningful — don't build it in Postgres by default when it lands.

## What's deliberately NOT built yet

Clothing upload/storage, AI style analysis, recommendations, community, marketplace, payments — all out of scope for this foundation per the brief. The schema comments in `backend/prisma/schema.prisma` sketch their shape so the next engineer isn't starting from zero, but no tables, routes, or UI exist for them.
