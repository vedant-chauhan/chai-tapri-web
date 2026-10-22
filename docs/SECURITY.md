# J (part 1). Security Plan

Status: general plan **Proposed**; **slice-1 section Confirmed 19 Oct 2026**. Target: OWASP ASVS Level 2 for staff/admin and money flows. PCI DSS SAQ-A scope.

## Threat model (top risks → controls)

| Threat | Control |
|---|---|
| Tampered prices/totals/quantities from the browser | Server recomputes everything from the DB. Zod validation (positive integer qty ≤ {20}, known IDs only, modifier min/max). Totals never accepted from the client |
| Order enumeration (viewing others' orders) | Order status via a random 128-bit token. No sequential IDs in URLs. Admin endpoints check role on every request |
| Forged webhooks (fake "payment succeeded") | Verify Stripe-Signature / Square signature / Uber `x-uber-signature` HMAC over the raw body, with constant-time compare. Reject stale timestamps. Then re-fetch the object from the provider API for money-critical events |
| Replay / duplicate events | `webhook_event` unique constraint. Idempotent handlers. Monotonic state machine |
| Staff account takeover | Better Auth (or chosen library), strong password policy, **MFA required for manager/owner** (TOTP/passkeys), login rate limiting, session expiry (12 h staff, re-auth for refunds/role changes), audit log |
| Privilege misuse | Roles: staff (orders, sold-out, pause ≤ 2 h), manager (+hours, menu, refunds ≤ limit), owner (+staff, integrations, kill switch). Least privilege. Audit log for sensitive actions |
| Checkout abuse (card testing, bot orders) | Provider radar/fraud tools. Rate limit place-order per IP/device/email. Cloudflare Turnstile only if abuse appears (accessibility cost). Max order value cap |
| Injection / XSS | ORM parameterised queries. React escaping. Strict CSP (nonce-based), no `dangerouslySetInnerHTML` for user content. Admin rich text sanitised |
| CSRF | SameSite=Lax/Strict cookies, Server Actions origin checks, CSRF token on admin forms |
| Secrets leakage | Wrangler secrets per Worker environment (staging/production separated) + GitHub Actions secrets. Test keys in preview, live keys only in production. No secrets in git (gitleaks in CI). Rotate on staff exit |
| Supply chain | Lockfile, Renovate/Dependabot with review, `npm audit` in CI, minimal dependencies, pinned GitHub Actions |
| PII exposure | Redaction in logs/Sentry (`beforeSend` scrub). No PII in analytics. Synthetic data in non-prod. Encryption at rest (provider default) + TLS everywhere. HSTS |
| Third-party outage used as an attack/failure vector | Timeouts (≤ 8 s), circuit-breaker flags (auto-disable delivery), graceful degradation |
| Bearer links (SmartShoot) | Keep confidential. Don't paste into public tools/repos |

## Headers & platform
HSTS (preload after stabilising), CSP, `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (deny camera/mic/geolocation except where needed), `frame-ancestors 'none'` (except provider 3DS frames per their docs).

## Operational security
- Owner holds the provider accounts (Stripe/Square, Uber Direct, domain, Cloudflare, Neon, GitHub) under **business** email with MFA. The developer gets delegated access, not shared passwords.
- Access review quarterly and on staff/vendor change.
- Incident runbook: payment issue, data breach, site down, Uber outage, POS outage (who to call, how to pause ordering, how to inform customers).
- Pre-launch: dependency audit, an OWASP ZAP baseline scan of staging, a manual review of auth/admin/webhooks. A professional penetration test is optional (budget dependent).

## Slice 1 — threat model (pickup ordering) — Confirmed 19 Oct 2026

**Assets:** card authorisations/captures (via Stripe), customer name/email/phone, the order board (staff actions move money), owner controls (open/close, hours).
**Actors:** anonymous customer, a customer probing others' orders, bots/card testers, staff, manager, owner, a compromised staff account, forged webhook sender.

| Entry point | Abuse case | Control (all server-side) | Test |
|---|---|---|---|
| `POST /orders` | Tampered prices, negative/huge qty, unknown option IDs, options from another product | Zod schema, reprice from DB, option must belong to one of the product's groups, qty 1–20, ≤ 30 lines, total ≤ A$500 | Unit + API tests with tampered payloads |
| `POST /orders` | Card testing / spam orders | Rate limit 5/min per IP and per email. Stripe Radar. Authorise-only means nothing is captured without staff acceptance. Alert when the declined-authorisation rate spikes | Rate-limit test |
| `GET /orders/{token}` | Enumeration of other orders | 128-bit random token. 404 for unknown. No email/phone in the response. Tokens never logged in full | Test random tokens → 404 |
| `POST /orders/{token}/cancel` | Cancelling someone else's order | Token required. State check. Rate limit | API test |
| `/api/webhooks/stripe` | Forged "payment succeeded" | Signature verification on the raw body. Re-fetch the PaymentIntent before money-state changes. Dedupe on event id | Invalid-signature, replay and out-of-order tests |
| Staff API | Customer calling staff endpoints. Staff calling owner endpoints | Session required. Capability check per endpoint (deny by default). Owner-only `ordering.open` / `hours.edit` | Authorisation matrix test (every endpoint × every role + anonymous) |
| Staff sign-in | Credential stuffing | Rate limit, generic errors, TOTP mandatory for manager/owner, 12 h session, re-auth for refunds | Auth tests |
| Order detail | Bulk harvesting of phone numbers by a rogue staff account | Phone masked by default. Reveal is audited. No bulk export in slice 1 | Audit log test |
| Refund | Double refund, over-refund | Idempotency key. Lock the payment row. Sum check ≤ captured. Manager+ only. Audited | Concurrency test |
| `/api/cron/sweep` | External trigger to force timeouts | `CRON_SECRET` bearer check. Sweep steps are idempotent anyway | API test |
| Admin text fields (decline note, exception reason/public note) | Stored XSS on public pages | React escaping. Length limits. No HTML rendering | Test with a script payload |

**Secrets (slice 1):** `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (public by design), `AUTH_SECRET`, `CRON_SECRET`, `EMAIL_API_KEY`. Held as Wrangler secrets per Worker environment (ADR-0012). Test keys in preview/staging, live keys in production only. `.env.example` lists names only.
**Logging:** request id, order id, status transitions, error codes. Never card data, client secrets, full tokens, email or phone (redacted by a logger serializer + Sentry `beforeSend`).
