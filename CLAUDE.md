# Chai Tapri Perth — Website & Online Ordering

## Current phase

**Phase 4 — Foundation, in progress** (started 20 Oct 2026). Plan: `docs/design/PHASE-4-FOUNDATION.md` (Confirmed). Hosting: Cloudflare Workers via OpenNext (ADR-0012). Only foundation work in this phase, no customer-facing features. See `docs/PROJECT_OVERVIEW.md`.

## Working in this repo

- Package manager: pnpm via corepack (`corepack pnpm <cmd>` if pnpm isn't on PATH). Node 24.
- Local DB for tests: PGlite (in-process Postgres). CI uses a Postgres 16 service. `docker-compose.yml` is optional.
- Commit/push only when the user asks.

## Rules

- Requirements → architecture → implementation. Nothing is decided until it is marked `Confirmed` in `docs/` with the owner's approval.
- Prices, totals, availability, permissions and order state are enforced on the server only.
- Never invent business facts (menu, prices, hours, policies). Use labelled assumptions and add the question to `docs/CLIENT_QUESTIONS.md`.
- Never commit secrets. The client's SmartShoot review link is a bearer link: treat it as confidential.
- Customer personal data (names, phones, addresses) never goes into logs, analytics, or non-production databases.

## Approval gates (owner must approve)

- Any phase transition.
- Choice of POS integration path, payment provider, hosting, database, auth approach.
- Anything that changes money flow: fees, delivery-fee policy, refunds, capture timing.
- Publishing customer-facing legal text (privacy policy, terms, refund policy).
- Production deployment and DNS changes.

## Definition of done (from phase 5)

Requirement linked → server-side rules enforced → tests for happy path, edge and failure cases pass in CI → accessibility checked (keyboard + axe) → docs updated → deployed to staging and exercised.

## Evidence labels used in docs

`[Verified]` official/primary source checked · `[Third-party]` non-official source · `[Inference]` reasoned, not confirmed · `[Recommendation]` technical advice · `[Assumption]` placeholder pending client answer · `[Unknown]`
