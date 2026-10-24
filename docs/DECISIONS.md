# Architecture Decision Records

ADR-0001 to ADR-0007 were **Confirmed on 15 Oct 2026** by the project lead (approval relayed in the project session). Later changes need a new ADR that supersedes the old one.

## ADR-0001: Overall architecture — full-stack TypeScript modular monolith
- Status: Confirmed (project lead, 15 Oct 2026). **Hosting part (Vercel) superseded by ADR-0012 on 20 Oct 2026.** The rest (Next.js monolith, Postgres, Drizzle, outbox) still stands.
- Context: one shop, small team, unknown POS, need for custom availability logic and distinctive UX, low running cost (ARCHITECTURE.md §1).
- Options considered: A Next.js monolith on Vercel · B Astro + separate API/worker · C POS-native/Uber webshop ordering + brand site.
- Decision: Option A (Next.js App Router, TypeScript, Vercel Sydney, PostgreSQL Sydney, Drizzle).
- Rationale: full control with the lowest operations load. One codebase. A framework-free domain layer keeps the move to Option B cheap.
- Consequences: background work uses an outbox + cron sweeps. Some Vercel-specific features (cron, `after()`) are wrapped behind small interfaces.
- Revisit when: the POS's native ordering is good enough and the client prefers lowest cost (→ C); long-running workflows appear (→ add Inngest or move to B); the maintainer's skills differ.

## ADR-0002: PostgreSQL as the primary datastore
- Status: Confirmed (project lead, 15 Oct 2026)
- Decision: managed Postgres in Sydney (Neon or Supabase, chosen at foundation), Drizzle migrations in git.
- Rationale: transactions, constraints, row locking for idempotency/capacity. Portable.
- Revisit when: never likely. The provider can be switched with a dump/restore.

## ADR-0003: POS integration through an adapter; launch on the staff order board
- Status: Confirmed (project lead, 15 Oct 2026)
- Decision: MVP launches on P3, the staff order board where staff accept/decline every order (required anyway, REQ-012). `PosAdapter` interface reserved. P1 direct API or P2 middleware is added once a POS is chosen.
- Consequences: launch isn't blocked by the POS choice. Staff ring web orders into the till separately until the adapter exists (double entry).

## ADR-0004: Payment provider; authorise at checkout, capture on acceptance
- Status: Confirmed (project lead, 15 Oct 2026)
- Decision: if a POS is chosen before phase 5 and it is Square → Square Web Payments; otherwise → **Stripe Payment Element** (POS-independent). **Authorise at checkout, capture when staff accept, release on decline/timeout.** No card surcharges.
- Rationale: manual acceptance means some orders will be declined, and capture-on-accept means those customers are never charged. Stripe is the best API and doesn't depend on a POS. Square is cheaper on small baskets (2.2% vs 1.65% + 30c; Square cheaper below ≈ A$55) and native if Square POS is chosen.
- Revisit when: the POS is chosen, or a negotiated merchant rate appears.

## ADR-0005: Uber Direct for delivery, customer pays the fee
- Status: Confirmed (project lead, 15 Oct 2026)
- Decision: integrate Uber Direct quotes/deliveries/webhooks with the fee passed through to the customer. The delivery is created when staff accept. Pickup ships first. Delivery follows in the same release train once API access (F3) and the minimum order/max distance (F2) are confirmed.
- Rationale: the remaining risks are API access and a customer-visible fee on small orders, not account approval.

## ADR-0006: Lean custom admin, no headless CMS at MVP
- Status: Confirmed (project lead, 15 Oct 2026)
- Decision: build operational admin screens in-app. Structured page content stored in the DB.
- Alternatives: Payload CMS 3 embedded in Next.js. A separate headless CMS (Sanity/Contentful).
- Revisit when: marketing content grows (blog, campaigns) or non-technical editors need rich layouts.

## ADR-0007: Motion via CSS/View Transitions first
- Status: Confirmed (project lead, 15 Oct 2026)
- Decision: CSS transitions, the View Transitions API and IntersectionObserver. Motion (MIT) if React layout animation needs it. GSAP only for an approved scroll-story section. No WebGL, no scroll-jacking.

## ADR-0008: Database provider — Neon Free (Sydney), with a planned upgrade trigger
- Status: Confirmed (project lead, 20 Oct 2026)
- Context: ADR-0002 left the provider to phase 4. The project lead chose free tiers where possible (20 Oct 2026).
- Decision: Neon **Free** in `aws-ap-southeast-2`. Two projects so quotas don't mix: `chai-tapri-prod` (production only) and `chai-tapri-nonprod` (staging, dev and preview branches; 10 branches). Max autoscale capped at 0.25 CU so usage is predictable. Connect from Workers with the **Neon serverless driver** (HTTP for single queries, WebSocket pool per request for interactive transactions), not a long-lived pool.
- Verified limits (20 Oct 2026): 100 CU-hours per project per month (= 400 h at 0.25 CU), **compute suspended until next month or an upgrade if exceeded**, scale-to-zero after 5 min and it can't be disabled, ~~1 GB~~ **0.5 GB storage per project** (corrected 24 Oct 2026 from neon.com/pricing; ample for this shop's data), 6-hour restore window, no commercial-use restriction stated.
- Main risk: the staff board polls during trading hours (~13 h/day ≈ 395 h/month), which is right at the cap. Mitigations: (1) usage alert at 70% of CU-hours; (2) **upgrade trigger** — move production to Neon Launch (≈ US$11–15/month at the same usage: 100 CU-h × US$0.106) before the first real launch, or as soon as usage trends over 80%; (3) board reads served from a short-lived cache in Workers KV where safe, so polls don't wake the DB (phase-5 optimisation).
- Also: the 6-hour restore window is weak for production. A nightly logical backup (`pg_dump` from CI to R2) is added in phase 4.
- Exit: standard Postgres, pg_dump/restore.
- Re-checked 24 Oct 2026 against Supabase at the project lead's request: Neon kept. Supabase Pro is a fixed US$25/month (vs ≈ US$11–15 usage-based on Neon Launch), its Free plan pauses after a week of inactivity, and its bundled auth/storage/realtime duplicate Better Auth and Cloudflare, which we already use.

## ADR-0009: Transactional email — Resend Free, Pro at launch
- Status: Confirmed (project lead, 20 Oct 2026)
- Decision: Resend Free (3,000/month, **100/day**, ~33 orders/day at 3 emails each) for build and staging. **Upgrade trigger:** Pro (US$20/month) when daily orders regularly exceed ~25, or at launch if volume is expected above that.
- Alternative: Postmark Basic (US$15/month).

## ADR-0010: Tooling baseline
- Status: Confirmed (project lead, 20 Oct 2026)
- Decision: Next.js 16.x (pinned minor) built with the **OpenNext Cloudflare adapter** (`@opennextjs/cloudflare`; Next.js 16 supported `[Verified]`) and run on the Workers runtime with `nodejs_compat`. Node.js 24 LTS for local dev and CI. TypeScript strict, pnpm, ESLint + Prettier, Tailwind, Zod, Drizzle (`neon-serverless` driver in runtime; `pg` against a Postgres 16 container for integration tests, same SQL), Better Auth + twoFactor (MFA gate for manager/owner), Vitest, Playwright + axe, Sentry (Cloudflare SDK), Dependabot + gitleaks, rate limiting in Postgres.
- Constraints adopted: **no Node middleware** (unsupported on OpenNext Cloudflare `[Verified]`), so auth checks run in layouts/route handlers (better practice anyway). **No `next/image` optimisation service:** item photos are pre-resized at import into AVIF/WebP widths and served as free static assets with a custom loader.
- Note: OpenNext doesn't guarantee full Windows support `[Verified]`. Develop in WSL2 or rely on CI (Linux) for Cloudflare builds and previews.
- Revisit when: Node 26 LTS (28 Oct 2026) is available in CI, or OpenNext limitations block a feature.

## ADR-0011: Code hosting — GitHub Free organisation (private repo)
- Status: Confirmed (project lead, 20 Oct 2026)
- Decision: an owner-held GitHub organisation on **Free**, private repo, GitHub Actions (2,000 min/month on private repos `[Verified]`).
- Trade-off accepted: repository rules (enforced "CI must pass before merge") aren't available for private repos on Free `[Verified]`. Replaced by a working rule: every change lands by PR, merged only when CI is green, and production deploys come only from `main`. **Upgrade trigger:** GitHub Team (US$4/user/month) when a second developer joins or a bad merge slips through.

## ADR-0012: Hosting — Cloudflare Workers (Paid plan) instead of Vercel
- Status: **Confirmed — direction approved by the project lead, 20 Oct 2026.** Implementation details are in the Phase 4 plan (Confirmed 20 Oct 2026). Supersedes the hosting part of ADR-0001.
- Context: the project lead asked to minimise paid tools. Vercel Pro (~US$40/month for two seats) isn't needed at this scale. Vercel Hobby is non-commercial and limits cron to once a day, so it isn't allowed.
- Options considered: Vercel Pro · Cloudflare Workers Free · **Cloudflare Workers Paid** · Netlify/Render free tiers (not evaluated in depth; Render's free tier sleeps).
- Decision: **Cloudflare Workers Paid (US$5/month per account)**, Next.js via OpenNext, Cron Triggers every minute for the sweep, static assets for images, Cloudflare DNS (free) for the domain, Workers Builds connected to GitHub for deploys.
- Verified facts (20 Oct 2026): Paid = US$5/month minimum, 10M requests + 30M CPU-ms included, CPU up to 30 s per request by default (max 5 min), Worker size 64 MiB, 250 Cron Triggers per account with 30 s CPU each for sub-hourly schedules, **cron every minute supported (runs in UTC)**, static asset requests free and unlimited, no egress charges, Hyperdrive included (unlimited queries on Paid), Workers Builds 6,000 build minutes/month on Paid.
- Why not Workers Free: 10 ms CPU per request and a 3 MiB compressed Worker limit `[Verified]`, which a Next.js app with auth and payments is likely to exceed.
- Trade-offs: ~2–3 extra developer days (OpenNext setup, the scheduled handler, the image pipeline, the Neon driver). Fewer turnkey conveniences than Vercel. Windows dev needs WSL2. Cron runs in UTC (the domain code already works in `Australia/Perth` via the injectable clock).
- Consequences: replaces "Vercel Cron" with Cron Triggers, `after()` with `ctx.waitUntil()` behind the same interface, and Vercel env vars with Wrangler secrets per environment.
- Revisit when: OpenNext blocks a needed Next.js feature, or the team prefers paying for Vercel's workflow. Exit: same Next.js code, redeploy to Vercel or a Node host.
