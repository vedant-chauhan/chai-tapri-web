# J (part 3). Deployment, Operations & Cost Plan

Status: general plan **Proposed**; slice-1 environment plan Confirmed 19 Oct 2026 and **re-platformed to Cloudflare Workers by ADR-0012 (20 Oct 2026)**. The section below reflects the change.

## Environments
| Env | Purpose | Data | Keys |
|---|---|---|---|
| Local | Development | Seeded synthetic menu/orders | Test keys |
| Preview (per PR) | Review by developer/client | Ephemeral DB branch or shared staging DB, synthetic | Test keys |
| Staging | UAT, integration testing, resilience drills | Synthetic + real menu copy (no customer PII) | Test/sandbox keys |
| Production | Live | Real | Live keys (owner-held accounts) |

## Pipeline
GitHub → Actions (gates in TESTING.md) → Cloudflare preview → merge to `staging` → staging Worker deploy → merge to `main` → **manual promote** to the production Worker. DB migrations run as an explicit step before promote, written to be backward-compatible (expand → migrate → contract). Rollback: `wrangler rollback` to the previous Worker version for code. Migrations are designed to be forward-fixable.

## Operations
- **Monitoring:** Sentry errors (alert on new issue in checkout/webhooks), uptime checks every 1 min on `/` and `/api/health` (DB + provider reachability), a synthetic Uber quote check every 15 min during trading hours, outbox dead-letter alert, reconciliation mismatch alert. Alerts go to the owner/manager by SMS/email plus the developer.
- **Backups:** provider daily backups (7-day retention on Supabase Pro `[Verified]`). Weekly logical dump to separate storage. **Quarterly restore test.** PITR add-on (~US$100/mo on Supabase `[Verified]`) only if RPO < 24 h is required.
- **Support model (to agree):** who answers "my order didn't arrive" (shop) vs "site is down" (developer). Response times. A retainer or ad-hoc arrangement.
- **Domain/DNS:** owner-registered `.com.au` (and `.com` defensively?), Cloudflare DNS, email authentication (SPF/DKIM/DMARC) for transactional mail.

## Cost summary (AUD, indicative — see ARCHITECTURE.md §6)
- **Build (one-off):** depends on who builds and the scope. Rough effort estimate for Option A MVP (pickup + delivery + POS adapter + admin): **~8–12 developer-weeks** + design **~2–3 weeks** + content/photo shoot. `[Assumption]` — to refine after the POS answer.
- **Run (monthly fixed, updated 20 Oct 2026):** ≈ US$5 (≈ A$8) at the start on the low-cost setup. ≈ US$16–40 (≈ A$25–62) once the Neon and Resend upgrade triggers fire. POS middleware (if ever added) is extra. Details in `design/PHASE-4-FOUNDATION.md` §2.
- **Per order:** payment fee (~1.65% + 30c Stripe or 2.2% Square) + Uber Direct per delivery (A$10 + A$1.10/km ex GST).
- **Other:** half-day photo/video shoot (quote locally), legal review of policies, accessibility audit (optional).

## Slice 1 — environment plan — Confirmed 19 Oct 2026, re-platformed 20 Oct 2026 (ADR-0012)

| Env | Hosting | Database (Neon Free, Sydney) | Stripe | Email | Sweep |
|---|---|---|---|---|---|
| Local | `next dev` (fast UI work) + `opennextjs-cloudflare preview` / `wrangler dev` (Workers runtime; WSL2 on Windows) | Docker Postgres 16 (seeded) | Test keys + `stripe listen` | Console sender | `wrangler dev --test-scheduled` or `curl` the cron route with `CRON_SECRET` |
| Preview (per PR) | Cloudflare preview `[mechanism confirmed at setup: Workers preview URLs or a preview Worker]` | Branch in the `chai-tapri-nonprod` project | Test keys | Sandbox / allow-listed recipients | Off (E2E suite calls the sweep) |
| Staging | Worker `chai-tapri-staging`, deployed from the `staging` branch, behind **Cloudflare Access** | `staging` branch of `chai-tapri-nonprod` | Test keys, real webhook endpoint | Resend sandbox | Cron Trigger every minute |
| Production | Worker `chai-tapri-production`, deployed from `main` | Project `chai-tapri-prod` (own CU-hour quota; **upgrade to Launch before go-live recommended**) | **Live keys** (owner's Stripe account) | Verified domain (SPF/DKIM/DMARC) | Cron Trigger every minute |

Facts checked 20 Oct 2026: Workers Paid US$5/month; Cron Triggers support every-minute schedules and run in UTC; static assets free and unlimited; Neon Free = 100 CU-hours/project/month with suspension when exceeded `[Verified — Cloudflare and Neon docs]`.

**Backups:** nightly `pg_dump` of production (GitHub Actions) → Cloudflare R2, 30-day retention. **Quarterly restore test** into a non-prod branch, recorded here. Neon Free's own restore window is only 6 hours.

**Phase-4 prerequisites (owner actions; no accounts created by us without approval):** see `setup/OWNER-ACCOUNTS.md`: GitHub (Free), Cloudflare (Workers Paid), Neon (Free), Stripe, domain, Resend (Free), Sentry (Free). Credentials are shared through each platform's member invites, never by chat or email.

**Rollback for slice 1:** `wrangler rollback` (previous Worker version) for code. Migrations are additive in slice 1, so rolling code back is safe. Stripe objects are untouched by deploys.
