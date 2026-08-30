# Production Deployment Guide

Target architecture: **Vercel** (frontend) + **Render or Railway** (backend) + a **hosted PostgreSQL** instance (Render/Railway/Neon/Supabase all work — the app only needs a `DATABASE_URL`).

This doc assumes the code changes described in the production reliability audit are in place (env-driven cookie config, CORS allowlist, etc.). If you're reading this before applying those, do that first — none of the steps below work around the cross-origin cookie issue, they rely on it being fixed.

---

## 0. Neon-specific setup

Neon gives you two connection strings per project (dashboard → your project → **Connect**):

- **Pooled** (hostname contains `-pooler`) → set as `DATABASE_URL`. This is what the running app uses for normal queries.
- **Direct/unpooled** (no `-pooler`) → set as `DIRECT_URL`. This is what Prisma Migrate uses — PgBouncer's transaction-pooling mode (which Neon's pooled connection uses) doesn't support the session-level operations `prisma migrate dev`/`deploy` need, so migrations have to bypass the pooler.

Both need `?sslmode=require` appended — Neon enforces SSL.

Create `backend/.env` (never committed — already covered by `.gitignore`) from `backend/.env.example`, and paste your real Neon values into `DATABASE_URL` and `DIRECT_URL` there, not into `.env.example` and not into any chat/ticket/PR description. Treat the connection string as a live credential — anyone with it can read and write your database directly.

## 1. One-time: generate the initial database migration

**This repository does not yet contain a Prisma migration.** `backend/prisma/schema.prisma` exists, but nothing in `backend/prisma/migrations/` does, so `prisma migrate deploy` (the production-safe command) has nothing to apply. This has to be generated once, locally, against a real reachable Postgres instance — it cannot be generated without a live database connection, so it isn't something that can be fabricated as part of a code review/audit pass.

```bash
# from repo root, backend/.env populated with real DATABASE_URL + DIRECT_URL
cd backend
npx prisma migrate dev --name init
```

Prisma automatically uses `directUrl` for this command (it's declared in `schema.prisma`), so it connects via Neon's unpooled endpoint even though the app itself will use the pooled one.

Commit the resulting `backend/prisma/migrations/` folder. From then on:
- Local dev / schema changes: `prisma migrate dev --name <description>`
- Production: `prisma migrate deploy` (applies existing migrations, never generates new ones, never prompts — safe for CI/CD)

---

## 2. Database

Provision a PostgreSQL instance (Render Postgres, Railway Postgres, Neon, Supabase — any of these). Copy its connection string; you'll need it as `DATABASE_URL` for the backend service. Make sure it includes `?sslmode=require` if your provider requires SSL (most managed Postgres does, including Neon) — Render/Railway internal databases typically don't need this if backend and DB are in the same region/network, but external/cross-provider connections usually do. If using Neon specifically, see §0 above for the pooled/direct URL split.

## 3. Backend — Render or Railway

**Root Directory:** repository root (not `backend/`) — this is a workspace monorepo; the backend's `package.json` alone can't resolve `@fashion-platform/shared` without the workspace install running from the root first.

**Build Command:**
```bash
npm install && npm run build:shared && npm run build:backend
```
(`npm install` also triggers `backend`'s own `postinstall` → `prisma generate`, and root's `postinstall` → `build:shared`; the explicit `build:shared`/`build:backend` calls here are the safety net in case your platform's install/build steps run in separate containers/steps where lifecycle scripts don't carry over — check this actually happened by confirming `backend/dist/server.js` and `shared/dist/index.js` exist after build, not just that the build command exited 0.)

**Pre-deploy / Start Command:** Render and Railway don't have a distinct "release phase" the way Heroku does, so run the migration as part of start:
```bash
npm run prisma:deploy --workspace=backend && npm run start --workspace=backend
```

**Environment variables** (see `backend/.env.example` for the full annotated list):

| Variable | Production value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | Leave unset — Render/Railway inject this; the app reads `process.env.PORT` |
| `CLIENT_ORIGIN` | Your Vercel domain(s), comma-separated, no trailing slash — e.g. `https://fashion-platform.vercel.app` |
| `DATABASE_URL` | From step 2 (Neon: the **pooled** connection string) |
| `DIRECT_URL` | Neon only: the **unpooled** connection string, used by `prisma migrate deploy` in the start command above |
| `JWT_ACCESS_SECRET` | `openssl rand -base64 64` — unique per environment, never the dev value |
| `JWT_REFRESH_SECRET` | Same as above, a *different* random value |
| `COOKIE_SAMESITE` | `none` — required because frontend/backend are on different domains |
| `COOKIE_SECURE` | Leave unset (forced to `true` automatically when `COOKIE_SAMESITE=none`) |
| `COOKIE_DOMAIN` | Leave unset unless frontend/backend share a registrable domain |
| `LOG_LEVEL` | `info` |
| `STORAGE_DRIVER` | `s3` — see "Durable image storage" below |
| `AI_PROVIDER` | `mock` unless you have a real `OPENAI_API_KEY` and have smoke-tested `VisionProvider` (see `docs/ARCHITECTURE.md`) |

## Durable image storage (Cloudflare R2)

`STORAGE_DRIVER=local` writes to the backend's own container disk, which Render/Railway wipe on every redeploy, restart, or scale event — uploaded wardrobe photos would not survive a redeploy. `S3StorageProvider` (backed by any S3-compatible service) fixes this; Cloudflare R2 is the recommended choice here specifically because it has a genuinely free tier (10GB storage, **zero egress fees** — unlike AWS S3, which bills for every byte served) and is fully S3-API-compatible, so no code changes are needed beyond setting env vars.

**Setup:**

1. Cloudflare dashboard → **R2** → **Create bucket**. Name it anything (e.g. `fashion-platform-uploads`).
2. In the bucket's **Settings** tab, enable **Public access** (via the R2.dev subdomain, or attach a custom domain) — this is what `S3_PUBLIC_URL` will point to. Copy that public URL.
3. Cloudflare dashboard → **R2** → **Manage R2 API Tokens** → **Create API Token**. Give it **Object Read & Write** permission, scoped to this bucket only. Copy the **Access Key ID** and **Secret Access Key** shown — the secret is only displayed once.
4. Your **Account ID** is visible in the R2 overview page URL or the right sidebar — you need it for the endpoint URL.

**Environment variables** (set these in Render's dashboard, not just locally):
```
STORAGE_DRIVER=s3
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=fashion-platform-uploads
S3_ACCESS_KEY_ID=<from step 3>
S3_SECRET_ACCESS_KEY=<from step 3>
S3_PUBLIC_URL=<from step 2>
```

**Migrating existing local uploads:** if you've already got files under `local` storage from testing, they won't automatically move to R2 — this fix only changes where *new* uploads go. Since this app has had no real beta users yet, there's nothing to migrate; if that changes before you switch drivers, re-upload is simpler than a migration script at this scale.

**Verify it worked:** upload a wardrobe photo after switching, then redeploy the backend (even with no code changes — just to prove the point) and confirm the photo still loads. That's the actual test of durability, not just "did the upload succeed."

## 4. Frontend — Vercel

**Root Directory:** `frontend` (Vercel's monorepo detection will still install from the workspace root — verify in the deploy log that it ran `npm install` at the repo root, not just inside `frontend/`, or the `@fashion-platform/shared` import will fail to resolve).

**Build Command:** leave as Vercel's auto-detected Next.js build, or explicitly:
```bash
cd .. && npm install && npm run build:shared && cd frontend && npm run build
```

**Environment variables:**

| Variable | Production value |
|---|---|
| `NEXT_PUBLIC_API_URL` | Your Render/Railway backend URL + `/api`, e.g. `https://fashion-platform-api.onrender.com/api` |

Remember `NEXT_PUBLIC_*` vars are baked in at build time — changing this value requires a redeploy (or at minimum triggering a new build), not just updating the value in the dashboard.

## 5. Verify the deploy

Run through the scenarios in the order below — they're ordered so an earlier failure explains a later one, rather than debugging them independently:

1. `GET https://<backend>/api/health` → `{ success: true, data: { status: "ok", ... } }`. If this fails, nothing downstream matters yet — check `DATABASE_URL` and that migrations ran.
2. Register a new account from the deployed frontend. Confirm in your Postgres provider's dashboard that a `users` row was created.
3. Open browser devtools → Application → Cookies, confirm `refreshToken` is present, scoped to the *backend's* domain, `HttpOnly` ✓, `Secure` ✓, `SameSite=None`.
4. Reload the dashboard page. You should stay logged in (a brief loading state, then the dashboard — not a bounce to `/login`). If you get bounced, check `COOKIE_SAMESITE` is actually `none` in the deployed backend's env, and that `CLIENT_ORIGIN` exactly matches the frontend's real origin (scheme + host, no trailing slash).
5. Log out. Confirm the `refreshToken` cookie is gone from devtools, and confirm `POST /api/auth/refresh` now returns 401.
6. Open the Network tab, find a request to a protected endpoint, confirm `Authorization: Bearer <token>` is present and confirm a request with that header stripped/mangled gets a 401.

If step 3 or 4 fails specifically with a cookie that's missing `SameSite=None` or missing `Secure`, that's an env var propagation problem on the host (confirm it actually redeployed with the new value) — it is not a code path this audit left unhandled.

---

## Environment variable reference

### Backend

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | Yes | `development` \| `test` \| `production` |
| `PORT` | No (default 4000) | Usually injected by the host in production |
| `CLIENT_ORIGIN` | Yes | Comma-separated allowlist of frontend origins for CORS + cookie validation |
| `DATABASE_URL` | Yes | Full Postgres connection string (Neon: the pooled `-pooler` string) |
| `DIRECT_URL` | Only if using Neon | Unpooled connection string, used exclusively by Prisma Migrate |
| `JWT_ACCESS_SECRET` | Yes | ≥32 chars, unique per environment |
| `JWT_REFRESH_SECRET` | Yes | ≥32 chars, unique per environment, different from the access secret |
| `JWT_ACCESS_EXPIRY` | No (default `15m`) | jsonwebtoken duration string |
| `JWT_REFRESH_EXPIRY` | No (default `30d`) | Also used to compute the refresh-token DB row's `expiresAt` |
| `COOKIE_SAMESITE` | No (default `lax`) | Set to `none` for cross-domain frontend/backend deployments |
| `COOKIE_SECURE` | No | Auto-`true` in production or whenever `COOKIE_SAMESITE=none`; override only for local HTTPS testing |
| `COOKIE_DOMAIN` | No | Only set if frontend/backend share a registrable domain |
| `LOG_LEVEL` | No (default `info`) | `error` \| `warn` \| `info` \| `debug` |
| `STORAGE_DRIVER` | No (default `local`) | `local` \| `s3` — use `s3` in production (Render/Railway disks are ephemeral) |
| `S3_ENDPOINT` | Only if `STORAGE_DRIVER=s3` | e.g. `https://<account-id>.r2.cloudflarestorage.com` for Cloudflare R2 |
| `S3_REGION` | No (default `auto`) | R2 uses `auto`; AWS S3 uses a real region like `us-east-1` |
| `S3_BUCKET` | Only if `STORAGE_DRIVER=s3` | |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | Only if `STORAGE_DRIVER=s3` | R2 API token, or AWS IAM access keys |
| `S3_PUBLIC_URL` | Only if `STORAGE_DRIVER=s3` | Public base URL for reading objects back — R2's public bucket URL or a custom domain in front of it |
| `UPLOAD_DIR` | No | Local disk path, only used when `STORAGE_DRIVER=local` |
| `PUBLIC_UPLOAD_URL` | No | Public base URL for served uploads, only used when `STORAGE_DRIVER=local` |
| `MAX_UPLOAD_SIZE_MB` | No (default 5) | Multer file size limit |
| `AI_PROVIDER` | No (default `mock`) | `mock` \| `openai_vision` |
| `AI_MOCK_LATENCY_MS`, `AI_MOCK_FAILURE_RATE` | No | Mock provider tuning, irrelevant in production if using `openai_vision` |
| `AI_REQUEST_TIMEOUT_MS` | No | |
| `OPENAI_API_KEY` | Only if `AI_PROVIDER=openai_vision` | |
| `OPENAI_VISION_MODEL` | No (default `gpt-4o-mini`) | |

### Frontend

| Variable | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | Backend base URL including `/api`. Baked in at build time. |
