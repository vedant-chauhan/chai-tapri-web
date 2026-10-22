# Chai Tapri — Website & Online Ordering

Next.js 16 app for Chai Tapri, Northbridge (Perth): business website + pickup ordering, later Uber Direct delivery.
Hosting: Cloudflare Workers via OpenNext. Database: Neon Postgres (Sydney). Payments: Stripe.
Project state, decisions and plans live in [`docs/`](docs/PROJECT_OVERVIEW.md). Start with `CLAUDE.md`.

## Status (20 Oct 2026)
Phase 4 (foundation) has started. The scaffold files are in place (generated with `create-next-app` 16.4.2; adapted `package.json`), but **nothing is installed or built yet**. Development continues on another device.

## Set up a development machine
Requirements: **Node.js 24 LTS**, Git. pnpm comes from corepack (bundled with Node 24). Recommended: WSL2 or macOS/Linux for Cloudflare builds and previews (OpenNext doesn't guarantee full Windows support). Docker is optional.

```bash
corepack pnpm install
corepack pnpm dev
```

## Remaining Phase 4 local tasks (see docs/design/PHASE-4-FOUNDATION.md §5)
- **F4-1 (part done):** add the OpenNext Cloudflare adapter + Wrangler (`wrangler.jsonc`, `open-next.config.ts`, custom worker with `scheduled()`), Prettier, design-token stub. Verify `lint`, `typecheck`, `build` and the OpenNext build.
- **F4-2:** Vitest + fake clock, Playwright + axe smoke test, optional `docker-compose.yml` (Postgres 16).
- **F4-3:** Drizzle (Neon serverless driver at runtime; PGlite/`pg` in tests), zod env validation, first migration (`store_settings`, `cron_heartbeats`).
- **F4-4:** redacting logger, API error shape, `/api/health`, cron route + `scheduled()` handler with heartbeat.
- **F4-5:** Better Auth staff sign-in, TOTP, roles, admin guard, MFA gate, `create-owner` CLI.
- **F4-6:** security headers/CSP baseline, `.env.example` / `.dev.vars.example`, Dependabot, gitleaks, image resize script (needs the owner's menu photos in the repo's `assets-src/menu/`).

Note: `package.json` already lists scripts (`test`, `db:*`, `images`, `cf:*`…) whose tools are added in the tasks above. They won't run until those dependencies are installed.

Before writing Next.js code, read the version-matched docs in `node_modules/next/dist/docs/` (see `AGENTS.md`). Next.js 16 has breaking changes.
