# Chai Tapri Perth — Project Overview

**Phase:** 4 — Foundation, **in progress** (started 20 Oct 2026). Local tasks F4-1…F4-6 first; cloud tasks F4-7…F4-12 wait for the owner's accounts.
**History:** Phase 1 discovery delivered 14 Oct 2026. Phases 1→2→3 approved by the project lead on 15 Oct 2026 (ADR-0001…0007 and the design direction Confirmed). Slice-1 design approved 19 Oct 2026. Unanswered follow-ups (F1–F11, Q6, Q10) are **explicitly deferred** with labelled assumptions in the slice design.
**Next gate:** Phase 4 exit (criteria 1–7 in the [Phase 4 plan](design/PHASE-4-FOUNDATION.md)). Local tasks F4-1…F4-6 are built (22 Oct 2026); cloud tasks F4-7…F4-12 wait for the owner's accounts ([setup/OWNER-ACCOUNTS.md](setup/OWNER-ACCOUNTS.md)). Two implementation deviations need the project lead's review: Cache Components off, CSP without nonces ([§7](design/PHASE-4-FOUNDATION.md#7-local-tasks-f4-1f4-6--status-22-oct-2026)).

## Blueprint index

| Deliverable | Document |
|---|---|
| A. Business research report | [discovery/A-business-research.md](discovery/A-business-research.md) |
| B. Asset inventory | [discovery/B-asset-inventory.md](discovery/B-asset-inventory.md) |
| C. Product requirements | [REQUIREMENTS.md](REQUIREMENTS.md) |
| D. Sitemap & page specs | [SITEMAP.md](SITEMAP.md) |
| E. UI/UX direction | [DESIGN_DIRECTION.md](DESIGN_DIRECTION.md) |
| F. Technology comparison & recommendation | [ARCHITECTURE.md](ARCHITECTURE.md) §1–4, §6 |
| G. System architecture | [ARCHITECTURE.md](ARCHITECTURE.md) §5 |
| H. Data model & integration plan | [DATABASE.md](DATABASE.md), [INTEGRATIONS.md](INTEGRATIONS.md) |
| I. Operational workflows | [BUSINESS_RULES.md](BUSINESS_RULES.md) |
| J. Security, testing, deployment, cost | [SECURITY.md](SECURITY.md), [TESTING.md](TESTING.md), [DEPLOYMENT.md](DEPLOYMENT.md) |
| K. Phased roadmap | [ROADMAP.md](ROADMAP.md) |
| L. Client clarification checklist | [CLIENT_QUESTIONS.md](CLIENT_QUESTIONS.md) |
| Compliance (section 8) | [COMPLIANCE.md](COMPLIANCE.md) |
| Decisions (ADRs) | [DECISIONS.md](DECISIONS.md) |
| Menu master data (from the client's menu board) | [MENU.md](MENU.md) |
| **Phase 3 — Slice 1 detailed design (pickup ordering)** | [design/SLICE-01-pickup-ordering.md](design/SLICE-01-pickup-ordering.md) · [API.md](API.md) · [DATABASE.md](DATABASE.md) §6 · Slice-1 sections in [SECURITY.md](SECURITY.md), [TESTING.md](TESTING.md), [DEPLOYMENT.md](DEPLOYMENT.md) |
| **Phase 4 — Foundation plan** (Confirmed 20 Oct 2026) | [design/PHASE-4-FOUNDATION.md](design/PHASE-4-FOUNDATION.md) · owner account checklist [setup/OWNER-ACCOUNTS.md](setup/OWNER-ACCOUNTS.md) |
| Sources | [SOURCES.md](SOURCES.md) |
| Client-facing brief (blocking questions + approvals) | [Chai Tapri Website — Client Brief](https://claude.ai/code/artifact/96107e21-efd9-46b5-8bac-a50ca801ff1e) |

## Key findings
1. **The business is verified:** Chai Tapri, Shop 6/189 William St, Northbridge. Opened ~May 2026. 4.6★ from 197 Google reviews. Verified Instagram @chaitapri.perth. **No website.** Listed on Uber Eats and DoorDash. Probable entity Valam Enterprise Pty Ltd (ABN 31 696 781 405, GST-registered) — needs confirmation.
2. **The client assets are an Uber Eats SmartShoot set:** 21 high-res, consistent menu photos (no video, logo, interior or people shots). Good for menu items, too "catalogue" for a premium brand story. **Usage rights for the website must be confirmed.**
3. **The POS is unknown and decides a lot:** integration pattern, payment provider (Square POS → Square payments; otherwise Stripe), and the menu master. *(Resolved 15 Oct 2026: no POS chosen yet; launch on the staff order board, Stripe payments — ADR-0003/0004.)*
4. **Uber Direct is a courier, not an ordering channel.** We take the order and the payment. Uber bills the shop **A$10 + A$1.10/km ex GST** per delivery. On typical small chai baskets that can exceed the marketplace's 30% commission, so **a delivery-fee policy is a blocking business decision.** *(Resolved 15 Oct 2026: the customer pays the delivery fee — ADR-0005; minimum order still open, F2.)*
5. **Regulation changed recently:** card surcharges are banned from 1 Oct 2026. Drip-pricing rules commence 1 Jul 2027. The privacy small-business exemption still exists, but the site should follow APP-level practice anyway.
6. **Recommended stack:** Next.js + Postgres modular monolith on Cloudflare Workers (changed from Vercel by ADR-0012, 20 Oct 2026), outbox-based integrations, POS adapter with a manual fallback. **Launch pickup ordering first, then delivery.**

## Phase 4 progress (22 Oct 2026)
- 20 Oct: decisions Confirmed; Next.js 16.4.2 scaffold copied in.
- 22 Oct: development resumed on a new machine. Initial commit pushed to a **private temporary repo** `vedant-chauhan/chai-tapri-web` (to be transferred to the owner's GitHub org, ADR-0011). **F4-1…F4-6 built** on branch `phase4/local-foundation`: OpenNext/Wrangler config with staging/production envs and the minute Cron Trigger, Vitest + Playwright/axe, Drizzle + first migrations, health/cron/heartbeat, Better Auth staff sign-in with TOTP and roles, security headers, env examples, Dependabot, gitleaks, image pipeline. All local checks pass. Status, deviations and open points: [PHASE-4-FOUNDATION §7](design/PHASE-4-FOUNDATION.md#7-local-tasks-f4-1f4-6--status-22-oct-2026).
- 23 Oct: PR #1 (F4-1…F4-6) and PR #2 (CI workflow) merged; CI green. **Sequencing decision by the project lead:** repo transfer (rest of F4-7) after the website is fully developed; cloud tasks F4-8…F4-12 later. Next: customer-facing site + live store-status backend, built and reviewed locally ([PHASE-4-FOUNDATION §7](design/PHASE-4-FOUNDATION.md#sequencing-decision-project-lead-23-oct-2026)).

## Waiting on the project lead (29 Oct 2026)
- **Google Places API key** for live Google reviews (ADR-0013). Until it's set, the "Show Google reviews" button stays hidden and the section shows the dated rating + link. Steps: OWNER-ACCOUNTS item 9 (or a temporary developer key in `.env.local`, never shared in chat).
- **Franchise Google Form link** and franchise details (CLIENT_QUESTIONS F14).

## Client answers received 15 Oct 2026
POS not chosen yet (kept open) · the customer pays delivery · the client already uses Uber Direct · website prices = the in-store menu board (37 items, [MENU.md](MENU.md)) · same-day orders only · ordering stops automatically each night, and the owner can open or close it manually · **staff accept every order** · photos supplied by the owner · allergens to follow. Follow-ups F1–F11 are in [CLIENT_QUESTIONS.md](CLIENT_QUESTIONS.md).

## Decision status

| Decision | Status |
|---|---|
| ADR-0001 Architecture (Next.js monolith) | **Confirmed** 15 Oct 2026 |
| ADR-0002 PostgreSQL | **Confirmed** 15 Oct 2026 |
| ADR-0003 Launch on the staff order board; POS adapter later | **Confirmed** 15 Oct 2026 (POS still open) |
| ADR-0004 Stripe unless Square POS is chosen first; capture on acceptance | **Confirmed** 15 Oct 2026 |
| ADR-0005 Uber Direct, customer pays delivery | **Confirmed** 15 Oct 2026 (build waits on F1–F3) |
| ADR-0006 Lean custom admin | **Confirmed** 15 Oct 2026 |
| ADR-0007 CSS-first motion | **Confirmed** 15 Oct 2026 |
| Design direction "The Tapri, after dark" | **Confirmed** 15 Oct 2026 |
| Slice-1 detailed design (SLICE-01, API, DATABASE §6, slice-1 security/testing/environments) | **Confirmed** 19 Oct 2026 |
| ADR-0008 Neon **Free** (Sydney), separate prod project, upgrade to Launch before go-live | **Confirmed** 20 Oct 2026 |
| ADR-0009 Resend **Free**, Pro when orders exceed ~25/day | **Confirmed** 20 Oct 2026 |
| ADR-0010 Tooling baseline (Node 24, Next.js 16 via OpenNext on Workers, pnpm, Drizzle + Neon driver, Better Auth…) | **Confirmed** 20 Oct 2026 |
| ADR-0011 GitHub **Free** organisation (private repo, PR-only working rule) | **Confirmed** 20 Oct 2026 |
| ADR-0012 Hosting on **Cloudflare Workers Paid** (US$5/month) instead of Vercel | **Confirmed** 20 Oct 2026 (direction) |

## Research limitations
- DoorDash (Cloudflare) and Uber Eats (reCAPTCHA) store pages could not be viewed. I didn't attempt to bypass bot checks.
- Individual Google reviews beyond the summary need a Google sign-in. Low-star review causes are unknown.
- No official menu/prices exist online. The third-party prices are marketplace prices and must not be used.
- Uber Direct AU Service Terms/Order Form are not public. Idempotency and cancellation-fee details need confirmation from Uber.
- Legal points are research summaries, not legal advice.
