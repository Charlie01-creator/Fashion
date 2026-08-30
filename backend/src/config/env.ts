import "dotenv/config";
import { z } from "zod";

/**
 * Validate environment variables at startup rather than discovering a
 * missing secret at request time in production. Fail loud, fail fast.
 */
const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().default(4000),

    // Comma-separated list of allowed frontend origins, e.g.
    // "https://fashion-platform.vercel.app,https://staging.fashion-platform.vercel.app"
    // Kept as a single env var (not an array-shaped one) because that's what
    // every host's dashboard (Vercel/Render/Railway) can actually store.
    // Vercel preview deployments get a unique URL per PR — add a wildcard-free
    // list of the previews you need, or point CI at a stable preview alias.
    CLIENT_ORIGIN: z
      .string()
      .min(1)
      .default("http://localhost:3000")
      .transform((val) =>
        val
          .split(",")
          .map((origin) => origin.trim().replace(/\/$/, ""))
          .filter(Boolean)
      )
      .pipe(z.array(z.string().url()).min(1, "CLIENT_ORIGIN must contain at least one valid URL")),

    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

    JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 chars"),
    JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 chars"),
    JWT_ACCESS_EXPIRY: z.string().default("15m"),
    JWT_REFRESH_EXPIRY: z.string().default("30d"),

    // --- Refresh-token cookie ---
    // "lax" works fine when frontend and backend share a site (same registrable
    // domain, or you're proxying /api/* through the Next.js app). The moment
    // frontend and backend live on different domains (Vercel + Render/Railway,
    // which is the default for this stack) the browser will NOT attach a
    // SameSite=Lax cookie to cross-site fetch()/XHR calls — only to top-level
    // navigations. That silently breaks refresh-on-reload and logout, with no
    // console error to point at. Set COOKIE_SAMESITE=none in that deployment
    // shape. SameSite=None is only honoured by browsers when Secure is also
    // set, which is why COOKIE_SECURE effectively can't be false alongside it
    // (enforced below, not just documented).
    COOKIE_SAMESITE: z.enum(["lax", "none", "strict"]).default("lax"),
    // Defaults to true in production, false in dev, but can be forced either
    // way (e.g. testing the cross-site cookie path against a local HTTPS tunnel).
    COOKIE_SECURE: z
      .enum(["true", "false"])
      .optional()
      .transform((val) => (val === undefined ? undefined : val === "true")),
    // Only set this if frontend and backend share a registrable domain, e.g.
    // both under ".example.com". Leave unset for Vercel/Render's default
    // *.vercel.app / *.onrender.com subdomains — they don't share an eTLD+1,
    // so a Domain attribute can't make the cookie cross between them anyway.
    COOKIE_DOMAIN: z.string().optional(),

    LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),

    // --- Storage ---
    STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
    UPLOAD_DIR: z.string().default("uploads"),
    PUBLIC_UPLOAD_URL: z.string().default("http://localhost:4000/uploads"),
    MAX_UPLOAD_SIZE_MB: z.coerce.number().default(5),

    // --- S3-compatible storage (required only when STORAGE_DRIVER=s3) ---
    // Works with Cloudflare R2, AWS S3, Backblaze B2, or anything else that
    // speaks the S3 API — only S3_ENDPOINT changes between providers.
    S3_ENDPOINT: z.string().optional(),
    S3_REGION: z.string().default("auto"),
    S3_BUCKET: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    // Public base URL for reading objects back (R2 public bucket URL, or a
    // CDN/custom domain in front of the bucket). Distinct from S3_ENDPOINT,
    // which is the API endpoint used for uploads/deletes, not for reading.
    S3_PUBLIC_URL: z.string().optional(),

    // --- AI service ---
    AI_PROVIDER: z.enum(["mock", "openai_vision"]).default("mock"),
    AI_MOCK_LATENCY_MS: z.coerce.number().default(600),
    // Simulated random failure rate (0–1) for the mock provider, so the
    // pending -> analyzing -> failed -> retry path is actually exercised in
    // dev rather than only existing in theory. Set to 0 to disable.
    AI_MOCK_FAILURE_RATE: z.coerce.number().min(0).max(1).default(0.1),
    AI_REQUEST_TIMEOUT_MS: z.coerce.number().default(20_000),
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_VISION_MODEL: z.string().default("gpt-4o-mini"),
  })
  .refine((data) => data.AI_PROVIDER !== "openai_vision" || !!data.OPENAI_API_KEY, {
    message: "OPENAI_API_KEY is required when AI_PROVIDER=openai_vision",
    path: ["OPENAI_API_KEY"],
  })
  .refine(
    (data) =>
      data.STORAGE_DRIVER !== "s3" ||
      (!!data.S3_ENDPOINT && !!data.S3_BUCKET && !!data.S3_ACCESS_KEY_ID && !!data.S3_SECRET_ACCESS_KEY && !!data.S3_PUBLIC_URL),
    {
      message:
        "S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, and S3_PUBLIC_URL are all required when STORAGE_DRIVER=s3",
      path: ["STORAGE_DRIVER"],
    }
  );

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("❌ Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === "production";

/**
 * Resolved refresh-cookie attributes. Centralized here (rather than left as
 * inline literals in the auth controller) so every place that sets or
 * clears the cookie is guaranteed to agree — a mismatch between "set" and
 * "clear" attributes (e.g. different `path`) means `res.clearCookie()`
 * silently fails to remove it.
 *
 * secure is forced to true whenever sameSite is "none" because browsers
 * ignore SameSite=None cookies that aren't also Secure — there's no valid
 * production configuration where these disagree, so we don't let env vars
 * produce one.
 */
export const cookieConfig = {
  sameSite: env.COOKIE_SAMESITE,
  secure: env.COOKIE_SAMESITE === "none" ? true : (env.COOKIE_SECURE ?? isProduction),
  domain: env.COOKIE_DOMAIN,
} as const;
