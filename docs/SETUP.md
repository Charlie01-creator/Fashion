# Setup Guide

## Prerequisites

- Node.js 20+
- PostgreSQL 14+ (local install, or Docker)
- npm 10+ (workspaces support)

## 1. Install dependencies

```bash
npm install
```

## 2. Database

```bash
docker run --name fashion-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=fashion_platform -p 5432:5432 -d postgres:16
```

## 3. Environment variables

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Generate real JWT secrets (don't ship the placeholder values):
```bash
openssl rand -base64 64   # run twice — one for JWT_ACCESS_SECRET, one for JWT_REFRESH_SECRET
```

## 4. Build shared types and run migrations

```bash
npm run build:shared
npm run prisma:generate --workspace=backend
npm run prisma:migrate --workspace=backend
```

## 5. Run

```bash
npm run dev:backend    # http://localhost:4000
npm run dev:frontend   # http://localhost:3000
```

## Production checklist

See `DEPLOYMENT.md` for the full step-by-step deployment guide. Short version:

- [ ] Real, unique JWT secrets per environment (never reuse dev secrets)
- [ ] `NODE_ENV=production`
- [ ] `CLIENT_ORIGIN` set to your real frontend domain(s) (comma-separated)
- [ ] `COOKIE_SAMESITE=none` if frontend and backend are on different domains (the default for Vercel + Render/Railway) — see `docs/ARCHITECTURE.md`
- [ ] Initial Prisma migration generated and committed (`npx prisma migrate dev --name init`) — there is no migration in this repo yet; `prisma migrate deploy` has nothing to apply until one exists
- [ ] `prisma migrate deploy` (not `migrate dev`) run against the production database before/at each deploy
- [ ] HTTPS everywhere — cookies are marked `secure` in production and will silently not be set over plain HTTP
- [ ] Centralized log aggregation for the Winston JSON output (Datadog/CloudWatch/etc.)
- [ ] Review rate-limit thresholds in `backend/src/routes/auth.routes.ts` against real traffic expectations
- [ ] Uploaded images: `STORAGE_DRIVER=local` writes to the backend's own disk, which is ephemeral on Render/Railway (wiped on every redeploy/restart). Not fixed in this pass — flagged as a pre-launch blocker for the upload feature specifically, separate from the auth/deploy reliability work done here.
