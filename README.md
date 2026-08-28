# Fashion Platform

AI-powered personal fashion assistant — Phase 1 foundation.

## Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Node.js, Express, TypeScript, PostgreSQL, Prisma
- **Auth**: JWT access tokens (in-memory client-side) + rotating refresh tokens (httpOnly cookie)

## Structure

```
fashion-platform/
├── frontend/     Next.js app
├── backend/      Express API
├── shared/       Types shared by both (single source of truth for contracts)
└── docs/         Architecture, API, database, setup docs
```

## Quick start

```bash
npm install
cp backend/.env.example backend/.env      # fill in DATABASE_URL and JWT secrets
cp frontend/.env.example frontend/.env.local

npm run build:shared
npm run prisma:migrate --workspace=backend
npm run dev:backend      # http://localhost:4000
npm run dev:frontend     # http://localhost:3000
```

You need a running PostgreSQL instance locally (or use Docker: `docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres:16`).

See `docs/SETUP.md` for full setup, `docs/ARCHITECTURE.md` for design rationale, `docs/API.md` for endpoints, and `docs/DATABASE.md` for schema notes.

## ⚠️ Before deploying — read this

This foundation's cross-origin auth setup is now handled by environment configuration rather than left as an open problem — see `DEPLOYMENT.md` for the full guide and `docs/ARCHITECTURE.md` → "Cross-origin cookie constraint" for why it matters. Short version: set `COOKIE_SAMESITE=none` on the backend if frontend and backend are deployed on different domains (the default for Vercel + Render/Railway).
