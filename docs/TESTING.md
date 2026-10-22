# J (part 2). Testing Strategy

Status: general plan **Proposed**; **slice-1 section Confirmed 19 Oct 2026**. Risk-based: most effort on money, availability and integrations.

| Layer | Tooling | What it proves |
|---|---|---|
| Unit (domain) | Vitest, fixed fake clock | **Availability engine** (all cases in BUSINESS_RULES §1.4, midnight-crossing, exceptions, pauses, capacity), pricing (modifiers, GST, rounding), the state machine (illegal transitions rejected), delivery-fee policy |
| Property-based | fast-check | Totals always = sum of lines. Never negative. Availability never says "open" when the order is rejected |
| Integration (DB) | Vitest + ephemeral Postgres (Docker/Testcontainers or a Neon branch) | Transactions, unique constraints (duplicate webhook, duplicate checkout), slot capacity under concurrency (parallel place-order), outbox claim/retry |
| Contract | Recorded provider fixtures + signature tests | Stripe/Square/Uber webhook parsing & verification (valid, invalid, replayed, out-of-order). POS adapter contract tests shared by all adapters (P1/P2/P3) |
| Provider sandboxes | Stripe test mode + CLI, Square sandbox, Uber Direct test mode with **robocourier** automated delivery simulation, POS sandbox if any | End-to-end money and delivery flows without real money/couriers |
| E2E | Playwright on mobile (iPhone/Pixel) and desktop viewports | Browse → customise → pickup ASAP → pay (test card) → confirmation → admin sees order → mark ready. Delivery path. Closed/paused states. Sold-out item in cart. Expired quote. Payment failure + retry |
| Accessibility | axe-core in Playwright + manual keyboard/screen-reader pass (VoiceOver iOS, NVDA) | WCAG 2.2 AA on key flows |
| Performance | Lighthouse CI budgets + real-user Web Vitals | NFR-01 |
| Visual | Playwright screenshots at 390/768/1440 for key pages | Design regressions |
| Resilience drills (staging) | Fault injection flags | Uber returns 500 → delivery hidden + alert. POS down → admin board + alert. Webhook delayed 10 min → reconciliation repairs |
| UAT | Client staff on staging with a real phone and the counter workflow | Operational fit before launch |
| Launch rehearsal | Live mode, real low-value orders (A$1 test item, refunded) + 1 real Uber delivery | Production config is correct |

**Quality gates in CI:** typecheck, lint, unit + integration tests, migration check, gitleaks, dependency audit, Playwright smoke on the preview deploy. Merges to `main` are blocked on failure.

## Slice 1 — test plan (pickup ordering) — Confirmed 19 Oct 2026

Fake clock everywhere (`Australia/Perth`). Fakes at the boundary (`PaymentProvider`, `EmailSender`) for unit/integration tests. Stripe **test mode** for sandbox runs.

| Area | Level | Cases (each a test) |
|---|---|---|
| Availability engine | Unit | Every row of BUSINESS_RULES §1.4. Fri 23:50 open / Sat 00:40 closed (offset 30 → cut-off 00:30). Tue closed + next open Wed 11:00. Open override on Tue until 16:00. Close override with/without end. Date exception closed + special hours crossing midnight. Kill switch. Trading-day boundary at 04:59 vs 05:00 |
| Pricing | Unit + property | Chai Cutting vs Regular. Sandwich Raw vs Grilled. Extras ×2. Combos with required choices. Missing required group. Too many options. Option from another product. Qty 0/21. GST = round(total/11). Property: total = Σ lines ≥ 0 |
| State machine | Unit | Every allowed transition in slice-design §4.5. Every disallowed one rejected. Terminal states stay terminal |
| Order creation | Integration (real Postgres) | Same key twice → one order. Same key with a different body → 422. 10 parallel requests with one key → one order. Order numbers unique per trading day under parallel creation |
| Staff transitions | Integration | Two parallel accepts → one 200 + one 409. Accept after deadline → 409. Ready before capture → 409 |
| Outbox & sweep | Integration | Job claimed once under 2 concurrent sweeps (`skip locked`). Backoff schedule. Dead after 8. Lazy timeout on status read |
| Stripe webhooks | Contract (fixtures) | Valid, invalid signature, duplicate event, out-of-order (`succeeded` before `amount_capturable_updated`), `payment_failed` then retry success |
| Stripe sandbox | Integration (staging) | Authorise → capture. Authorise → cancel. Declined test card. 3-D Secure test card. Partial and full refund. Webhooks via the Stripe CLI locally, and the real endpoint on staging |
| Authorisation | API | Matrix of every staff endpoint × {anonymous, staff, manager, owner}. Customer token isolation |
| E2E | Playwright (390 px + 1280 px) | Order → board accept → status shows accepted. Decline path. Timeout path (fake clock via test hook in non-prod only). Closed-store path. Sold-out item in cart. Payment failure keeps the cart |
| Accessibility | axe + manual | Menu, item sheet (focus trap/return), checkout (error summary focus), status (live region), board (keyboard A/D) |
| Performance | Lighthouse CI | `/menu` mobile ≥ 90. JS budget 150 KB gz on `/menu` |

Gates: these run in CI on every PR. E2E runs against the preview deployment with Stripe test keys.
