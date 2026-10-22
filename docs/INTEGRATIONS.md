# H (part 2). Integration Plan — POS, Uber Direct, Payments, Google

Facts checked 14 Oct 2026. `[Verified]` = official docs/pages. Everything else is labelled.

## 1. System-of-record matrix

| Data | Owner if the POS has a usable API | Owner if the POS has no usable API | Sync |
|---|---|---|---|
| Item names, prices, modifiers, tax | **POS** | Website DB | POS → web: webhook or scheduled pull (every 5–15 min) + manual "Sync now". Web stores POS IDs. |
| Web-only presentation (photos, long descriptions, allergens, tags, sort order, web visibility) | Website DB | Website DB | Admin edits, keyed to the POS item ID |
| Sold-out / stock | POS (if supported), else website | Website | POS webhook/poll, or admin toggle |
| Shop hours, ordering windows, closures, pauses | **Website** (POSes rarely model online-ordering rules) | Website | Mirror to Google Business Profile manually (API Later) |
| Online orders (customer, items snapshot, totals) | **Website** (creator), with a copy in the POS | Website | Web → POS through the outbox, status back by webhook/poll |
| Payment state, refunds, disputes | **Payment provider** | Payment provider | Provider webhooks → web. Daily reconciliation. |
| Delivery state, courier, fees | **Uber Direct** | Uber Direct | Uber webhooks + `GET delivery` fallback |
| Staff accounts, roles, audit | Website | Website | — |
| Marketplace orders (Uber Eats/DoorDash) | Those marketplaces + POS | — | **Not touched by the website** |

## 2. POS integration

### 2.1 What we know
**The client hasn't chosen a POS yet (answer of 15 Oct 2026, kept open).** The tablet visible on the counter in Instagram footage may be a payment terminal or a temporary setup. Consequence: **MVP launches on pattern P3** (staff order board, which staff use anyway because they accept every order). The `PosAdapter` is implemented once a POS is chosen. If the client wants a recommendation, choose a POS with an open ordering API and AU support (e.g. Square, or Lightspeed via its partner programme) and compare total cost including payments.

### 2.2 Information needed (ask the client and the POS vendor)
1. Product name, edition/plan, version. Number of terminals. Kitchen printer or KDS in use?
2. Does the plan include API access or an online-ordering/integration add-on, and at what cost? Partner programme required?
3. API docs URL, sandbox availability, auth method (OAuth/API key), rate limits.
4. **Menu:** can we read items, categories, prices, modifier groups (min/max), tax settings, item images? Change webhooks?
5. **Orders:** can an external system create an order that prints in the kitchen / shows on the KDS? Pickup vs delivery fulfilment types? Scheduled (future) orders? Customer name/phone on the docket? Notes?
6. **Payments:** can the order be marked paid by an *external* tender (our Stripe payment), or must payment go through the POS's own processor?
7. **Status:** can we receive status changes (accepted, ready, completed, cancelled) via webhook or polling?
8. **Availability:** sold-out flags/stock levels readable? Webhooks?
9. Order ID mapping, idempotency support (can a retry create a duplicate?).
10. Commercial terms: integration fees, per-order fees, contract lock-in, who supports it when it breaks.
11. Does it already integrate with Uber Eats/DoorDash (directly, or via Deliverect/Doshii)? That middleware may also accept web orders.

### 2.3 Integration patterns (choose once the POS is known)

| Pattern | When | Pros | Cons |
|---|---|---|---|
| **P1. Direct POS API** (e.g. Square Orders + Catalog APIs, Lightspeed K-Series API via partner programme) | The POS has an open, documented ordering API | Lowest latency and running cost. Full control | Per-POS work. Partner approval for some (Lightspeed requires the partner programme `[Third-party]`) |
| **P2. Middleware** (Doshii — AU, lists Square, Lightspeed, Impos, OrderMate, Bepoz, Idealpos, SwiftPOS, H&L, etc. `[Verified, page may be dated]`. Deliverect — also routes marketplace orders) | The POS is supported by middleware but not directly | One integration covers many POSes. Already used for marketplaces | Monthly fee. Another failure point. Their order model limits ours |
| **P3. No POS integration — admin order board + kitchen printer** (e.g. cloud printer) | The POS has no API, or the client wants to launch before integration | Simple and reliable. Works on day 1 | Staff re-key orders into the POS (double entry, error risk at peak). Reporting split |

**Recommendation:** design a `PosAdapter` interface from day 1 (`fetchCatalog`, `submitOrder`, `getOrderStatus`, `parseWebhook`) with **P3 as the always-available fallback**. Implement P1 or P2 once the POS is confirmed. Launch can proceed on P3 if the POS integration slips, and that decision must be explicit (BR-ORD-9).

**If the POS is Square** `[Verified from Square docs]`: API-created orders appear in Square POS/Dashboard only when they **have a fulfilment and are fully paid**. Payment can be a Square payment or an **EXTERNAL** tender (proceeds not credited to Square). Square for Restaurants also accepts orders via Doshii/Deliverect. The KDS needs the Square for Restaurants Plus plan. → Strongly favours Square Web Payments for online payments (orders appear paid natively, refunds in one place).

### 2.4 Submission flow (any pattern)
1. Payment confirmed (webhook) → order `paid` → outbox `pos.submit` (idempotency key = order ID).
2. Worker submits. Success → store the POS order ID, `pos_status=submitted`. Failure → retry with backoff (1 min, 2, 5, 10…). After 3 failures or 3 minutes for ASAP orders → **alert staff** (admin banner + SMS/email) and show the order on the admin board for manual entry.
3. Scheduled orders: submit at `slot_start − (prep_time + buffer)` if the POS can't hold future orders, otherwise immediately with a due time.

## 3. Payments

### 3.1 Comparison

| Criterion | **Stripe** | **Square** | Tyro | Windcave | PayPal |
|---|---|---|---|---|---|
| AU entity & AUD settlement | Yes | Yes | Yes (AU bank) | Yes | Yes |
| Online fee | 1.65% + 30c domestic (from 1 Oct 2026). Intl 2.8% + 30c from 1 Apr 2027 `[Verified]` | 2.2% online `[Verified]` | Quote only `[Unknown]` | Package/quote `[Verified]` | Not checked |
| Methods | Cards, Apple Pay, Google Pay, Link, BNPL options | Cards, Apple/Google Pay | Cards, wallets `[Assumption]` | Cards, wallets, A2A | PayPal wallet |
| Refunds/disputes | API + dashboard. Dispute fee applies `[Assumption — check]` | POS + dashboard | Via Tyro portal | Portal/API | Portal |
| Reconciliation | Payouts API, reports, metadata = order ID | Unified with POS sales if the POS is Square | With Tyro EFTPOS | Reports | Separate |
| Security/compliance | PCI L1. Elements → SAQ-A | PCI L1. Web Payments SDK → SAQ-A | PCI L1 | HPP → SAQ-A `[Verified]` | — |
| Integration effort | Lowest. Excellent docs, test clocks, CLI webhook forwarding | Low–medium | Higher, sales-led | Medium, dev account via sales | — |
| Fit with stack | Excellent | Good | Fair | Fair | Add-on only |

### 3.2 Recommendation (ADR-0004, needs approval)
- **POS still undecided when payments are built (phase 5) → Stripe.** It doesn't depend on a POS. If Square is chosen later, web orders can still be recorded in Square as externally paid (EXTERNAL tender) `[Verified, Square docs]`. Cost note: on small baskets Square's 2.2% is cheaper (e.g. A$15 order: Square A$0.33 vs Stripe A$0.55). If the client is leaning towards Square POS, deciding now would let web payments use Square too.
- **POS is Square → Square Web Payments SDK + Orders API.** Paid web orders land in the POS natively, refunds live in one system, and the flat 2.2% is cheaper than Stripe for baskets under ~A$55.
- **Any other POS → Stripe Payment Element** with Apple/Google Pay. Orders are pushed to the POS as externally paid where supported.
- **Not recommended as primary:** PayPal (extra wallet, separate reconciliation) and Tyro/Windcave (sales-led onboarding, weaker developer tooling for a small custom build), unless the client already has a favourable merchant agreement.

### 3.3 Payment lifecycle rules
- PaymentIntent/Payment created **server-side** from the server-priced order. Amount = order total in cents. Idempotency key = `order_id + attempt`. Order ID in metadata.
- The order is "paid" **only on a verified webhook** (`payment_intent.succeeded` / Square `payment.updated` COMPLETED), never on the browser redirect alone. The redirect page polls the order status.
- **Capture timing (BR-PAY-2, updated 15 Oct 2026):** because **staff accept each order**, use **authorise at checkout → capture on acceptance → cancel the authorisation on decline/timeout.** Declined orders are never charged, with no refund fees. Same-day orders are accepted within minutes, far inside hold limits (Stripe online card holds: 7 days `[Verified — Stripe docs, 15 Oct 2026]`).
- **No card surcharge** (RBA reforms: surcharging on eftpos/Mastercard/Visa removed from 1 Oct 2026. Amex, PayPal and UnionPay also removed theirs `[Verified]`). Service or delivery fees are still allowed but must be shown upfront (see COMPLIANCE.md).
- Refunds go through the provider API from the admin, logged in the audit trail. Partial refunds supported per line or amount. Refund webhooks update the order.

## 4. Uber Direct

### 4.1 What Uber Direct is — and is not
- **Is:** white-label, on-demand courier delivery for orders the merchant takes on its **own** channels. Booked via API, dashboard or partner integrations. `[Verified]`
- **Is not:** a marketplace (that's Uber Eats). It does **not** take customer orders, **does not collect payment from the customer** (the merchant charges the customer, and Uber bills the merchant per delivery), and **does not sync with the POS**. `[Verified]` that Uber Direct is billed to the merchant. The rest follows from its design.
- The Uber Eats Merchant Agreement **does not govern** Uber Direct. It has separate Service Terms / Order Form `[Verified]`. The client's existing Uber Eats marketplace listing is unaffected.

### 4.2 Commercials (Australia, published) `[Verified]`
- A$10 base + **A$1.10/km** (estimated pickup→dropoff distance), ex GST.
- Wait time: A$0.50/min after 10 min at pickup.
- Undeliverable (fails delivery restrictions): cancellation fee = delivery fee + any return fee. Return trip = 50% of the delivery fee.
- Rates "may vary" by market and integration type. **Perth rate: get a written quote.** Delivery radius generally ≤ 15 km. Items ≤ 20 kg.
- No commission, no monthly minimums, no startup cost.
- **Economics example:** 3 km delivery ≈ A$13.30 ex GST (A$14.63 inc GST). On a A$25 basket that is 58% of the order value. On the Uber Eats marketplace the same order costs 30% commission ≈ A$7.50. → **Decided 15 Oct 2026: the customer pays the delivery fee.** Customers will see ~A$12–20 delivery on small orders, so a **minimum order and maximum distance** (F2) and a clear "pickup is free" message are recommended.

### 4.3 Access & eligibility `[Verified]`
- **The client already uses Uber Direct (15 Oct 2026).** To confirm (F3): is it dashboard-only, or is the Developer tab (Customer ID, Client ID/Secret, webhooks) available? The owner should add the developer as a user rather than share credentials. Test-mode credentials let us build safely.
- General: sign up at direct.uber.com (selected regions). New accounts start in **Test mode**. Production requires billing details and **account approval**.
- OAuth2 client credentials (`scope=eats.deliveries`). Tokens last 30 days, so cache and refresh them.
- Sandbox rate limit: 200 requests per 10 min. Production limits vary (429 `customer_limited`).
- Perth: Uber's Perth courier page lists Uber Direct with same-day, express and scheduled (up to 30 days) delivery `[Verified]`. Actual courier coverage of Northbridge at 1am on Saturday: `[Unknown]` — test with quotes.

### 4.4 Workflow
1. **Address entry** → geocode (lat/lng) → `POST /v1/customers/{id}/delivery_quotes` with pickup (shop) and dropoff, plus pickup/dropoff windows for scheduled orders.
   - The quote returns `fee` (cents), `pickup_duration`, `dropoff_eta`, `expires` (**15 min**) `[Verified]`.
   - No quote (out of range/no couriers) → explain and offer pickup.
2. **Checkout** shows the delivery fee per policy (pass-through, flat, or subsidised). If the quote expires before payment → re-quote. If the fee rises above a tolerance → ask the customer to confirm.
3. **After payment (and acceptance)** → outbox `delivery.create`: `POST /v1/customers/{id}/deliveries` with `quote_id`, pickup/dropoff names, phones, addresses + lat/lng, `manifest_items`, `external_id` = our order number, instructions, ready time = now + prep time (ASAP) or the slot time (scheduled), and the undeliverable action (likely **not return** for food — confirm).
   - Idempotency: before retrying a create, check whether a delivery already exists for this order (list/get by `external_id`). Uber's idempotency support is `[Unknown — confirm with Uber technical contact]`.
4. **Tracking:** store `delivery_id` and `tracking_url` (use as-is, as it may change `[Verified]`). Show the link to the customer.
5. **Webhooks:** `event.delivery_status` (pending → pickup → pickup_complete → dropoff → delivered | canceled | returned), `event.courier_update`, refund webhook. Verify **`x-uber-signature` HMAC-SHA256 over the raw body** with the per-webhook signing key. Uber retries only on 5xx/timeouts (3 attempts), so also poll `GET delivery` for active deliveries every few minutes as a safety net `[Verified]`.
6. **Failures:**
   - Create fails after payment → retry ×3 → alert staff → options: re-quote/re-dispatch, convert to pickup (call the customer), or refund (full or delivery fee only).
   - Courier cancels/no courier found → auto re-dispatch once → alert staff.
   - `returned`/undeliverable → staff decision. Fees per Uber terms. Customer refund per our policy.
   - Shop pauses or closes after scheduled deliveries exist → admin lists affected orders, staff decide (keep/cancel + refund). Cancel the Uber deliveries.
7. **Reconciliation:** weekly report of Uber delivery fees billed vs delivery fees charged to customers.

### 4.5 Depends on account approval / agreement / POS
| Capability | Depends on |
|---|---|
| Production deliveries, Perth pricing | Uber account approval + Order Form |
| Brand-managed vs Uber-managed customer support | Commercial agreement (Uber-managed may cost extra) `[Verified]` |
| POS creating Uber Direct jobs itself | Only if the POS/middleware has an Uber Direct integration (then our site might not call Uber at all) |
| Late-night availability, proof-of-delivery/PIN options | Market configuration — test in production with low volume |

## 5. Google reviews

- **Options:** (a) Places API (New) Place Details with the reviews/rating fields, fetched server-side. Google returns only a small set of reviews (believed to be 5 `[Assumption — verify]`). (b) Rating + review count + link only. (c) Curated quotes with each reviewer's permission.
- **Policy constraints `[Verified]`:** credit each review's author (name/avatar/link), show Google Maps/Google attribution, link each review to Google Maps, say how reviews are ordered, and **don't cache Places content** beyond the allowed exceptions (place ID can be stored).
- **Recommendation:** (a) with a short in-memory/request cache only as the terms allow, plus a graceful fallback to (b). Never copy reviews into our DB. Never filter to only 5★ reviews while implying they are representative.

## 6. Other integrations
- **Email (Resend/Postmark):** order confirmation (tax invoice), status changes, staff alerts. SPF/DKIM/DMARC on the domain.
- **Google Business Profile:** keep hours consistent with the website (manual at MVP).
- **Analytics:** privacy-friendly analytics (e.g. Plausible / Cloudflare Web Analytics) without cross-site tracking → no consent banner needed for basic use `[Recommendation]`. Ads pixels (Meta/Google Ads) need a consent decision first.
