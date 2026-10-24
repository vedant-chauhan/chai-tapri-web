# Phase 4 — Foundation Plan (low-cost setup)

Status: **Confirmed by the project lead, 20 Oct 2026** (low-cost version). The hosting direction is fixed by ADR-0012 (Cloudflare Workers Paid, approved 20 Oct 2026). ADR-0008…0011 (Neon Free, Resend Free, tooling, GitHub Free) were revised to match and Confirmed with this plan on 20 Oct 2026.
Owner actions: [setup/OWNER-ACCOUNTS.md](../setup/OWNER-ACCOUNTS.md).

## 1. Goal and exit criteria
Build the empty-but-real skeleton that slice 1 is built on. **No customer-facing features in this phase.** Done when all of these are shown working:
1. The app builds and runs locally from a clean clone with one documented command sequence (Windows: inside WSL2 for Cloudflare builds and previews).
2. CI (GitHub Actions) runs lint, typecheck, unit tests, integration tests against real Postgres, the OpenNext Cloudflare build, the secret scan and the dependency audit on every PR. Merge only when green (a working rule on GitHub Free, see ADR-0011).
3. Secrets live only in Cloudflare (Wrangler secrets per environment) and GitHub Actions secrets. `.env.example` has names only. The secret scan passes.
4. A trivial change goes PR → CI green → preview → merge → **staging** Worker deploy, and is visible on staging.
5. Migrations run through one tool everywhere. The first migration is applied to staging. A nightly logical backup to R2 runs, and one restore is tested and recorded.
6. A staff owner account can sign in with TOTP on staging. `/admin` rejects anonymous users and wrong roles.
7. `/api/health` and the **Cron Trigger every minute** (empty sweep for now) run on staging, with the heartbeat visible. Errors reach Sentry with personal data scrubbed.

## 2. Stack and the facts behind it (checked 20 Oct 2026)

| Piece | Choice | Key verified facts | Cost |
|---|---|---|---|
| Hosting | **Cloudflare Workers Paid** + OpenNext Cloudflare adapter | US$5/month minimum. 10M requests and 30M CPU-ms included. CPU up to 30 s/request by default. Worker up to 64 MiB. Static asset requests free and unlimited. No egress fees. Next.js 16 supported by OpenNext. Node middleware not supported | **US$5/month** |
| Scheduled sweep | Cron Trigger `* * * * *` | Every-minute schedules supported. Runs in **UTC**. 30 s CPU per run for sub-hourly schedules. 250 triggers per account | Included |
| Deploys | Workers Builds connected to GitHub (or `wrangler deploy` from Actions) | 6,000 build minutes/month on Paid | Included |
| Database | **Neon Free**, Sydney, 2 projects (prod / non-prod), max 0.25 CU | 100 CU-hours/project/month = 400 h at 0.25 CU. **Suspended until next month if exceeded.** Scale-to-zero after 5 min (can't be disabled). 0.5 GB storage (corrected 24 Oct 2026). 6-hour restore window | **US$0** → ~US$11–15 if upgraded to Launch |
| DB connection | Neon serverless driver (HTTP + per-request WebSocket for transactions) | Avoids long-lived pooled connections that could keep the free compute awake. Hyperdrive (included on Paid, unlimited queries) is kept for later, once on a paid DB plan | Included |
| Email | **Resend Free** | 3,000/month, **100/day** (~33 orders/day) | **US$0** → US$20 at the upgrade trigger |
| Code & CI | **GitHub Free** org, private repo | Actions 2,000 min/month on private repos. Repository rules (enforced checks) not available on Free for private repos | **US$0** |
| Errors | Sentry free tier (Cloudflare SDK) | `[Assumption — confirm plan limits at setup]` | US$0 |
| Uptime | Free uptime monitor (e.g. Better Stack / UptimeRobot) | `[Assumption]` | US$0 |
| DNS | Cloudflare DNS (free) for the `.com.au` domain bought at an Australian registrar | — | Domain ~A$25–45/year |
| Backups | Nightly `pg_dump` from GitHub Actions → Cloudflare R2 | R2 free allowance should cover a few small dumps `[Assumption — verify R2 pricing at setup]` | ~US$0 |
| Staging protection | Cloudflare Access in front of the staging Worker | Free for small teams `[Assumption — verify Zero Trust free plan at setup]` | US$0 |

**Monthly total at the start: ≈ US$5 (≈ A$8)** plus the domain. Realistic after launch, with the upgrade triggers hit: **≈ US$5–40 (≈ A$8–62)**, compared with ≈ US$70–100 on the Vercel plan.

### Upgrade triggers (decide when they fire, not now)
| Trigger | Action | Added cost |
|---|---|---|
| Neon prod CU-hours > 70% mid-month, or before the first real launch | Production project → Neon Launch | ~US$11–15/month |
| Daily orders regularly > 25 (emails > ~75/day) | Resend Pro | US$20/month |
| A second developer joins, or a bad merge slips through | GitHub Team | US$4/user/month |
| Sentry/uptime free limits hit | Paid tier | varies |

## 3. Design adjustments for Cloudflare (no change to the confirmed slice-1 behaviour)
- **Sweep:** a `scheduled()` handler is exported alongside the OpenNext fetch handler and calls the same sweep function as `POST /api/cron/sweep`. The HTTP route stays for local/manual runs (guarded by `CRON_SECRET`).
- **After-response work:** `ctx.waitUntil()` behind the `afterCommit()` interface (was `after()`).
- **Auth guard:** checked in the admin layout and every staff route handler. No middleware (OpenNext limitation, and better practice).
- **Images:** an import script resizes the owner's photos into 360/720/1080/1440 px AVIF + WebP. They're served as static assets, and a custom `next/image` loader picks the width. No paid image service.
- **Menu caching:** pages revalidate through OpenNext's incremental cache (KV or R2 binding, within included allowances `[Assumption]`). Customer browsing shouldn't wake the database.
- **Board polling vs the Neon quota:** the board polls every 5 s (slice-1 design). Each poll hits the DB during trading hours, which is the main CU-hour consumer, so the usage alert is set up in this phase. A KV-cached board snapshot (invalidated on every order change) is a phase-5 optimisation if needed.
- **Time:** Cron runs in UTC. All business logic already uses the injectable `Australia/Perth` clock.

## 4. Repository layout
```
/                       (repo root = this project folder; docs/ already here)
├─ src/app/             routes: (public)/, admin/, api/v1/, api/webhooks/, api/cron/
├─ src/domain/          pure TS: availability, pricing, orders, clock
├─ src/server/          db (drizzle schema + neon client), repositories, providers (stripe, email), outbox, auth, scheduled.ts
├─ src/ui/  src/lib/    components/tokens · logger (redacting), errors, env (zod-validated)
├─ db/migrations/  db/seed/
├─ scripts/             images.ts (resize pipeline), backup (CI)
├─ tests/{unit,integration,e2e}/
├─ .github/workflows/   ci.yml, backup.yml · dependabot.yml
├─ docker-compose.yml   local Postgres 16
├─ open-next.config.ts  wrangler.jsonc (envs: staging, production; cron; KV/R2 bindings)
└─ .env.example  .dev.vars.example   (names only)
```

## 5. Work breakdown

| # | Task | Needs accounts? | Acceptance |
|---|---|---|---|
| F4-1 | `git init`. Scaffold Next.js 16 (TS strict, Tailwind, ESLint, App Router, `src/`) + OpenNext Cloudflare adapter + Wrangler. Prettier, scripts, folder layout, design-token stub. WSL2 setup notes for Windows | No | `pnpm lint && pnpm typecheck && pnpm build` and the OpenNext build + local `wrangler dev` preview pass |
| F4-2 | Test harness: Vitest + fake clock, a first domain unit test, Playwright smoke + axe on `/`, docker-compose Postgres | No | `pnpm test`, `pnpm test:e2e` pass locally |
| F4-3 | Drizzle config (Neon driver at runtime, `pg` in tests), env validation, first migration (`store_settings`, `cron_heartbeats`) | No (local DB) | Migration applies on a fresh DB |
| F4-4 | Redacting logger, API error shape, `/api/health`, cron route + `scheduled()` handler with heartbeat | No | Integration tests: health 200/503, cron 401 without the secret. `wrangler dev --test-scheduled` triggers the handler |
| F4-5 | Better Auth: staff sign-in, TOTP enrolment, roles, admin layout guard, MFA gate for manager/owner, `create-owner` CLI (no default passwords) | No (local) | Auth tests: anonymous → redirect, staff OK, owner without TOTP → forced enrolment |
| F4-6 | Security headers + CSP baseline, `.env.example`/`.dev.vars.example`, Dependabot, gitleaks, image resize script | No | Header test. Gitleaks passes. Script outputs variants for the 20 menu photos |
| F4-7 | Push to the owner's GitHub org. CI workflow (frozen install → lint → typecheck → unit → integration (Postgres service) → OpenNext build → gitleaks → audit) | **GitHub** | All checks show on PRs |
| F4-8 | Cloudflare: staging and production Workers from `wrangler.jsonc` environments, Workers Builds (or Actions deploy), secrets per environment, Cron Trigger, KV/R2 bindings, Cloudflare Access on staging | **Cloudflare** | Staging URL behind Access. Preview per PR `[mechanism to confirm at setup: Workers preview URLs or a preview Worker]` |
| F4-9 | Neon: `chai-tapri-prod` and `chai-tapri-nonprod` projects in Sydney, max 0.25 CU, usage alert at 70%. Migrations in the deploy step. Nightly backup → R2 + one restore test | **Neon, Cloudflare (R2)** | Staging migrated. Backup file in R2. Restore recorded in DEPLOYMENT.md |
| F4-10 | Stripe test keys in staging/preview. Staging webhook endpoint verifies signatures | **Stripe** (test mode works before business verification) | Signature-verified test event recorded on staging |
| F4-11 | Sentry (Cloudflare SDK) + scrubber. Resend in sandbox until the domain exists. Uptime monitor on `/api/health` | **Sentry, Resend** | Test error without PII. Uptime green |
| F4-12 | Exit demo: trivial change through the whole path. Owner signs in with TOTP on staging | All | Exit criteria 1–7 shown |

**Effort:** about **7–10 developer-days** once the accounts exist (+2–3 days vs the Vercel plan) `[Assumption]`. F4-1 to F4-6 can start immediately after approval.

## 6. Risks
| Risk | Mitigation |
|---|---|
| **Neon Free quota runs out → production database suspended** | Separate prod project, 0.25 CU cap, 70% usage alert, and the upgrade to Launch (~US$11–15) before real launch. **Recommended: plan to upgrade before go-live** |
| Neon Free's 6-hour restore window | Nightly pg_dump to R2 + tested restore |
| OpenNext feature gaps (Node middleware unsupported; edge cases in the Workers runtime) | Auth in layouts/handlers. Smoke-test Stripe, Better Auth and the Neon driver in F4-1/F4-4 before committing further. Exit path to Vercel/Node host keeps the same code |
| Windows development friction | WSL2. CI on Linux is the source of truth |
| No enforced merge checks (GitHub Free) | PR-only working rule. Upgrade trigger to Team |
| Resend 100/day cap | Upgrade trigger before order volume reaches it |
| Account setup delays / legal entity unconfirmed (Q6) | Local work proceeds. Stripe live activation only blocks launch |

## 7. Local tasks F4-1…F4-6 — status (22 Oct 2026)

Built on branch `phase4/local-foundation` (repo `vedant-chauhan/chai-tapri-web`, private, temporary home until the owner's GitHub org exists, ADR-0011).

| # | Status | Evidence (all run locally on macOS, Node 24.22.1) |
|---|---|---|
| F4-1 | Done | `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm cf:build` pass. `wrangler dev` serves `/` with 200 and the security headers. Worker bundle 1.8 MiB gzip (`wrangler deploy --dry-run`) |
| F4-2 | Done | Vitest (fake clock: `fixedClock` + Vitest fake timers; first domain test = trading-day boundary). Playwright + axe on `/` at 390/1280 px. `docker-compose.yml` (Postgres 16 + Neon wsproxy) written, **not run** (no Docker on this machine) |
| F4-3 | Done | Drizzle schema + migrations `0000_foundation` (`store_settings`, `cron_heartbeats`), `0001_store_settings_row` (singleton), applied on a fresh DB by test and by `pnpm db:migrate`. Zod env validation (secrets required when `APP_ENV` is preview/staging/production) |
| F4-4 | Done (see open point 3) | Integration tests on real Postgres: health 200 / 503 (no DB, DB down, sweep never ran, lag > 5 min); cron 401 (no secret, wrong secret, no `CRON_SECRET` configured), 200 writes the heartbeat. `wrangler dev --test-scheduled`: `scheduled()` → internal `POST /api/cron/sweep` with the bearer → route runs |
| F4-5 | Done (see open point 3) | Integration tests: anonymous → sign-in redirect; staff OK; owner/manager without TOTP → forced enrolment; user without role → forbidden; TOTP enrol then second-factor sign-in; sign-up disabled; capability checks for staff routes. `create-owner` CLI (hidden prompt, min 12 chars, no password argument). E2E: `/admin` → sign-in, forms labelled, keyboard order, axe clean |
| F4-6 | Done (photos pending) | Header unit test + E2E header check. `.env.example` / `.dev.vars.example` (names only). Dependabot (weekly, 7-day cooldown). gitleaks: history and tree clean. `pnpm audit` clean (1 override + 2 reviewed exceptions, see `pnpm-workspace.yaml`). Image script tested on 20 generated photos (all widths × AVIF/WebP, EXIF rotation, metadata stripped, no upscaling); **real run waits for the owner's photos** in `assets-src/menu/` |

### Deviations from the plan (for the project lead's review)
1. **Cache Components off.** With `cacheComponents: true` (a create-next-app 16.4 default, not a documented decision) every page hung in the Workers runtime (OpenNext Cloudflare 1.20.12 + Next 16.4.2). It's off; caching uses the classic `revalidate`/`revalidateTag` model, which OpenNext supports. Revisit when OpenNext supports Cache Components. `[Verified locally]`
2. **CSP without nonces.** SECURITY.md's general plan says "Strict CSP (nonce-based)". Next.js nonces need Proxy (Node-only in Next 16, unsupported on OpenNext Cloudflare) and force every page to render dynamically, which conflicts with the cached menu. The baseline is a static CSP from `next.config.ts`: `default-src 'self'`, scripts only from our origin (+ `'unsafe-inline'` for Next's inline bootstrap), `object-src 'none'`, `frame-ancestors 'none'`, no third-party origins yet. `[Recommendation]` accept for slice 1; revisit if Next ships hash-based CSP for the App Router.
3. **Auth table names.** Better Auth's tables are stored as `staff_users`, `staff_sessions`, `staff_accounts`, `staff_verifications`, `staff_two_factors`, `auth_rate_limits` (DATABASE.md §6 conventions). The role was later merged onto `staff_users.role` (24 Oct 2026, migration 0005). Ids are app-generated UUID strings.
4. **Rate limiting** for sign-in/TOTP (5/min) uses Better Auth's limiter with Postgres storage, so it holds across Worker isolates.

### Open points
1. **Owner's menu photos** → `assets-src/menu/`, then `pnpm images` (originals stay out of git; usage rights F9).
2. **Staff TOTP optional** remains the slice-1 `[Assumption]`; manager/owner TOTP is enforced.
3. **Not yet exercised against a database inside the Workers runtime** (Neon driver over WebSockets): heartbeat written by the Cron Trigger, sign-in through the browser. Needs Docker (`docker compose up`) or the Neon account (F4-9). The same code paths are covered by integration tests on real Postgres.

### Sequencing decision (project lead, 23 Oct 2026)
- CI workflow is live (F4-7 part, PR #2): quality, integration (Postgres 16), E2E + axe, gitleaks, all green.
- **F4-7 repo transfer** to the owner's GitHub org: deferred until the website is fully developed.
- **F4-8…F4-12** (Cloudflare, Neon, Stripe, Sentry/Resend, exit demo): deferred to later.
- Next: build the customer-facing site and the live store-status backend locally (slice 1, starting with ROADMAP phase 3 "Content site + live status"). Consequence: no staging URL for client review until F4-8; reviews happen locally or by screen share. Phase 4 exit criteria 3–7 stay open until the cloud tasks run.

