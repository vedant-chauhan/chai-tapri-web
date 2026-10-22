# Chai Tapri — Website & Online Ordering

Next.js 16 app for Chai Tapri, Northbridge (Perth): business website + pickup ordering, later Uber Direct delivery.
Hosting: Cloudflare Workers via OpenNext. Database: Neon Postgres (Sydney). Payments: Stripe.
Project state, decisions and plans live in [`docs/`](docs/PROJECT_OVERVIEW.md). Start with `CLAUDE.md`.

## Status (22 Oct 2026)

Phase 4 (foundation): local tasks **F4-1…F4-6 are built and pass locally** (lint, typecheck, 94 unit/integration tests, `next build`, OpenNext build, 22 Playwright + axe tests in the Workers runtime, gitleaks, audit). Cloud tasks F4-7…F4-12 wait for the owner's accounts. Details and open points: [PHASE-4-FOUNDATION §7](docs/design/PHASE-4-FOUNDATION.md#7-local-tasks-f4-1f4-6--status-22-oct-2026).

## Set up a development machine

Requirements: **Node.js 24 LTS**, Git. Recommended: macOS/Linux, or WSL2 on Windows (OpenNext doesn't guarantee full Windows support). Docker is optional.

```bash
corepack enable pnpm        # puts pnpm on PATH (OpenNext's build calls `pnpm` directly)
pnpm install
pnpm exec playwright install chromium   # once, for E2E
pnpm dev                    # http://localhost:3000
```

Copy `.env.example` to `.env.local` (for `next dev`) or `.dev.vars` (for `wrangler dev`) and fill in values. Never commit them.

## Commands

| Command                                        | What it does                                                                                         |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `pnpm dev`                                     | Next.js dev server (fast UI work)                                                                    |
| `pnpm lint` · `pnpm typecheck` · `pnpm format` | ESLint · `next typegen` + `tsc` · Prettier                                                           |
| `pnpm test`                                    | Vitest: unit + integration (integration uses PGlite in memory, or `TEST_DATABASE_URL`)               |
| `pnpm test:e2e`                                | Playwright + axe at 390 px and 1280 px, against the real Workers build (`cf:build` + `wrangler dev`) |
| `pnpm build`                                   | `next build`                                                                                         |
| `pnpm cf:build` · `pnpm preview`               | OpenNext Cloudflare build · build + local Workers preview                                            |
| `pnpm cf-typegen`                              | Regenerate `cloudflare-env.d.ts` after changing `wrangler.jsonc`                                     |
| `pnpm db:generate`                             | Write a migration from `src/server/db/schema/` into `db/migrations/` (review it, commit it)          |
| `pnpm db:migrate`                              | Apply migrations to `DATABASE_URL` (`postgres://…` or `pglite://<dir>`)                              |
| `pnpm auth:create-owner --email … --name "…"`  | Create the first owner account (password at a hidden prompt; TOTP enrolment forced at first sign-in) |
| `pnpm images`                                  | Resize the owner's photos from `assets-src/menu/` into `public/menu/` (AVIF + WebP, 360–1440 px)     |

Scheduled sweep locally: `pnpm exec wrangler dev --test-scheduled`, then open `/__scheduled`. Or `curl -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:8787/api/cron/sweep`.

## Local database

- **Tests** need nothing: PGlite (in-process Postgres) is created per test file. CI will use a Postgres 16 service via `TEST_DATABASE_URL`.
- **Running the app against a database** (sign-in, health 200): the app reaches Postgres through the Neon serverless driver, which needs a WebSocket endpoint. Either `docker compose up -d` (Postgres 16 + Neon's wsproxy; set `DATABASE_URL=postgres://chai:chai@localhost:5432/chai_tapri`) or a Neon dev branch once the account exists (F4-9).
- Scripts (`db:migrate`, `auth:create-owner`) accept `postgres://…` or `pglite://<dir>`.

## Layout

```
src/app/            routes: page.tsx (holding page), admin/ (staff area), api/health, api/cron/sweep, api/auth
src/domain/         pure TS (clock.ts: injectable Australia/Perth clock, trading day)
src/server/         db/ (schema, Neon runtime client, Node client), auth/ (Better Auth, roles, guard), health, sweep, http
src/lib/            env (zod), logger (redacting), errors (API error shape), security headers, image loader
src/ui/             shared components
db/migrations/      SQL migrations (drizzle-kit), committed
scripts/            migrate, create-owner, images
tests/              unit/, integration/ (real Postgres), e2e/ (Playwright), support/
worker.ts           Worker entry: OpenNext fetch + scheduled() for the Cron Trigger
wrangler.jsonc      local / staging / production Workers config
```

Before writing Next.js code, read the version-matched docs in `node_modules/next/dist/docs/` (see `AGENTS.md`). Next.js 16 has breaking changes.
