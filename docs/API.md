# API Contract — Slice 1 (pickup ordering)

Status: **Confirmed by the project lead, 19 Oct 2026** (slice 1; drafted 15 Oct 2026). Contract first, code second: any change here is reviewed before implementation.
Implementation: Next.js route handlers under `/api/v1/*`. Server Actions used by our own pages call the **same domain functions** and return the same error codes. Validation with Zod. Unknown fields on writes → 400.

## Conventions
- **Money:** `{ "amountCents": 549, "currency": "AUD" }`. All amounts GST-inclusive. Never floats.
- **Time:** ISO 8601 UTC (`2026-10-15T05:30:00Z`). Store-local display strings are added where the UI needs them (`"localLabel": "1:30pm"`) and computed server-side in `Australia/Perth`.
- **IDs:** UUIDs for catalogue entities. Orders are addressed publicly only by `token` (opaque, 22+ chars). Staff endpoints use the order UUID.
- **Errors:** always
  ```json
  { "error": { "code": "cart_changed", "message": "Some items in your order changed.", "details": [ { "field": "items[1]", "code": "sold_out", "message": "Cheese Vada Pav is sold out today." } ], "requestId": "req_…" } }
  ```
  `message` is safe to show. No stack traces or internal IDs beyond `requestId`.
- **Idempotency:** `Idempotency-Key: <uuid>` header **required** on `POST /orders`, staff refunds and staff transitions. Same key + same body → same response. Same key + different body → `422 idempotency_mismatch`.
- **Concurrency:** staff transitions send `expectedStatus`. A mismatch → `409 conflict` with the current order.
- **Caching:** `GET /menu` → `s-maxage=60, stale-while-revalidate=300`, revalidated on admin change. Everything else `no-store`.
- **Rate limits (per IP + per customer email where relevant):** `POST /orders` 5/min, `POST /cart/price` 60/min, staff sign-in 5/min, cancel 5/min. Over limit → `429 rate_limited` with `Retry-After`.

## Public endpoints

### `GET /api/v1/store/status`
Live ordering status. Short cache (`max-age=10`).
```json
{ "open": true, "reason": null, "orderingUntil": "2026-10-15T13:30:00Z", "orderingUntilLabel": "9:30pm",
  "nextOpen": null, "notice": null, "prepMinutes": 10 }
```
Closed example: `{ "open": false, "reason": "outside_hours" | "paused" | "unavailable", "nextOpen": "…", "nextOpenLabel": "Wed 11am", "notice": "Closed for Diwali" }`.

### `GET /api/v1/menu`
Categories → products → option groups → options, with `available` flags (sold-out computed server-side), `price` objects, `image` (`src`, `width`, `height`, `alt`), `allergens`, `dietaryTags`. Archived and hidden items are excluded. Sold-out items are included with `available: false`.

### `POST /api/v1/cart/price`
Prices a cart. Non-binding preview, used by the cart and checkout summary.
Request:
```json
{ "items": [ { "productId": "uuid", "quantity": 2, "options": [ { "optionId": "uuid", "quantity": 1 } ] } ] }
```
Response `200`:
```json
{ "lines": [ { "productId": "uuid", "name": "Masala Chai", "options": [ { "name": "Regular", "priceDelta": { "amountCents": 100, "currency": "AUD" } } ],
               "quantity": 2, "unitPrice": { "amountCents": 549, "currency": "AUD" }, "lineTotal": { "amountCents": 1098, "currency": "AUD" }, "available": true } ],
  "subtotal": { "amountCents": 1098, "currency": "AUD" }, "total": { "amountCents": 1098, "currency": "AUD" },
  "gstIncluded": { "amountCents": 100, "currency": "AUD" }, "pricingVersion": 12, "orderable": true, "problems": [] }
```
`problems[]` lists sold-out items/options, rule violations (`option_required`, `too_many_options`, `quantity_out_of_range`) and `ordering_closed`. Always 200 for a well-formed request.

### `POST /api/v1/orders` (Idempotency-Key required)
Creates the order and its payment authorisation.
Request:
```json
{ "items": [ … same as /cart/price … ],
  "expectedTotalCents": 1098,
  "customer": { "name": "Asha", "email": "asha@example.com", "phone": "0412 345 678" },
  "notes": "Less sugar please", "acceptTerms": true, "marketingOptIn": false }
```
- Server reprices. If the total ≠ `expectedTotalCents` or anything is unavailable → `409 cart_changed` with details, and nothing is created.
- Phone normalised to E.164 (+61). Invalid → `400 validation_failed`.
Response `201`:
```json
{ "order": { "token": "Zr9…", "number": "#047", "status": "pending_payment", "total": { … } },
  "payment": { "provider": "stripe", "clientSecret": "pi_…_secret_…", "holdExpiresAt": "…" } }
```
Errors: `409 ordering_closed` (with `nextOpen`), `409 cart_changed`, `422 idempotency_mismatch`, `422 order_limit_exceeded`, `503 payment_unavailable`, `429 rate_limited`.
The browser then confirms the PaymentIntent with Stripe.js (Payment Element) and redirects to `/order/{token}`. **The redirect never changes state.**

### `GET /api/v1/orders/{token}`
Customer view (no auth: the token is the capability). Unknown token → `404 not_found`.
```json
{ "number": "#047", "status": "awaiting_acceptance", "paymentStatus": "authorised",
  "acceptDeadline": "…", "promisedReadyAt": null, "statusMessage": "Waiting for Chai Tapri to accept (usually within 5 minutes). Your card is on hold, not charged.",
  "items": [ … snapshots … ], "total": { … }, "gstIncluded": { … },
  "pickup": { "address": "Shop 6/189 William St, Northbridge WA 6003", "mapUrl": "…" },
  "declineReason": null, "timeline": [ { "status": "awaiting_acceptance", "at": "…" } ] }
```
Returns first name only and no email/phone. If past `accept_deadline_at` and still `awaiting_acceptance`, the handler triggers the timeout transition before responding (lazy enforcement). Polled every 5 s by the status page until terminal.

### `POST /api/v1/orders/{token}/cancel`
Allowed only while `pending_payment` or `awaiting_acceptance`. → `200` with the order, or `409 not_cancellable`.

## Webhooks

### `POST /api/webhooks/stripe`
- Verify `Stripe-Signature` over the **raw body** with the endpoint secret (tolerance 5 min). Invalid → `400` and nothing is stored beyond a security log line.
- Insert `webhook_events (provider='stripe', provider_event_id=event.id)`. A duplicate → `200` immediately.
- Handle: `payment_intent.amount_capturable_updated` → `awaiting_acceptance` · `payment_intent.succeeded` → payment `captured` · `payment_intent.canceled` → payment `cancelled` · `payment_intent.payment_failed` → payment `failed` (the order stays `pending_payment` until the hold expires, so the customer can retry) · `charge.refunded` / `refund.updated` → refund status.
- For money-moving events the handler **re-fetches the PaymentIntent** from Stripe and acts on its current state (protects against out-of-order delivery).
- Respond `200` within ~1 s. Slow work goes to the outbox.

## Staff endpoints (session cookie + role check on every call)

| Method & path | Role | Body / query | Result |
|---|---|---|---|
| `GET /api/v1/staff/board?since=<iso>` | staff+ | — | Orders in `awaiting_acceptance`, `accepted`, `ready` + those changed since `since`; store status; server time |
| `GET /api/v1/staff/orders/{id}` | staff+ | — | Full detail, phone masked (`04•• ••• 678`) |
| `POST /api/v1/staff/orders/{id}/reveal-phone` | staff+ | — | Full phone. Audited |
| `POST /api/v1/staff/orders/{id}/accept` | staff+ | `{ "expectedStatus": "awaiting_acceptance", "readyInMinutes": 10 }` (5–60) | `200` order (`accepted`, capture queued) · `409 conflict` · `409 accept_deadline_passed` |
| `POST /api/v1/staff/orders/{id}/decline` | staff+ | `{ "expectedStatus": "awaiting_acceptance", "reason": "too_busy" \| "item_unavailable" \| "closing_soon" \| "other", "note": "…" }` | `200` · `409` |
| `POST /api/v1/staff/orders/{id}/ready` | staff+ | `{ "expectedStatus": "accepted" }` | `200` · `409` · `409 payment_not_captured` |
| `POST /api/v1/staff/orders/{id}/collected` | staff+ | `{ "expectedStatus": "ready" }` | `200` · `409` |
| `POST /api/v1/staff/orders/{id}/cancel` | manager+ | `{ "expectedStatus": "accepted"\|"ready", "reason": "…", "refund": { "type": "full" } \| { "type": "lines", "orderItemIds": [ … ] } \| { "type": "amount", "amountCents": 450 } }` | `200` (refund queued) · `409` · `422 refund_exceeds_captured` |
| `GET /api/v1/staff/ordering` | staff+ | — | Status + active override |
| `POST /api/v1/staff/ordering/close` | staff+ | `{ "until": "<iso>" \| null, "reason": "…" }` (staff: `until` ≤ +2 h) | `200` status |
| `POST /api/v1/staff/ordering/open` | owner (or delegated manager) | `{ "until": "<iso>" }` (required, ≤ next trading-day boundary) | `200` · `422 until_required` |
| `DELETE /api/v1/staff/ordering/override` | owner (any role for its own close) | — | `200` back to schedule |
| `PATCH /api/v1/staff/products/{id}/availability` | staff+ | `{ "soldOut": true, "until": "end_of_day" \| "<iso>" \| null }` | `200` |
| `PATCH /api/v1/staff/options/{id}/availability` | staff+ | same | `200` |
| `GET` / `PUT /api/v1/staff/hours` | owner | weekly windows + `lastOrderOffsetMinutes` | `200` · `422 invalid_hours` (+ list of today's affected orders as a warning) |
| `GET` / `POST` / `DELETE /api/v1/staff/date-exceptions` | owner | `{ "tradingDate", "kind", "opensAt", "closesAt", "closesNextDay", "reason", "publicNote" }` | `201` / `204` |

All staff writes append to `audit_log`. Authorisation is checked server-side per capability (`orders.accept`, `orders.refund`, `ordering.open`, `hours.edit`, …), mapped from role in one module.

**Implementation notes (24 Oct 2026, additive):** `GET /staff/ordering` and the three ordering writes return `{ "status": <store status as in GET /store/status>, "override": { "id", "mode", "startsAt", "endsAt", "endsAtLabel", "untilReopened" } | null }`. `close`/`open` end times must fall within the current trading day (closures beyond it are date exceptions); staff `close` needs an end time ≤ +2 h; `open` needs ≥ the prep time left. A close "until reopened" ends at the next trading-day boundary [Assumption, CLIENT_QUESTIONS F12]. A new override replaces the active one; replaced and cleared rows are kept. Code: `src/server/store/`, `src/app/api/v1/`.

## Internal

### Sweep — Cloudflare Cron Trigger every minute (`scheduled()` handler), also exposed as `POST /api/cron/sweep` for local/manual runs (header `Authorization: Bearer $CRON_SECRET`)
Implementation note (ADR-0012, 20 Oct 2026): same sweep function for both entry points. Cron runs in UTC, while business rules use the `Australia/Perth` clock.
In order, each step bounded (≤ 50 rows) and idempotent: expire holds → time out unaccepted orders (+ escalation alerts at 3 min) → auto-complete `ready` > 60 min → reset the sold-out flags that passed → claim and run outbox jobs → reconcile Stripe (PIs created 2–60 min ago whose local state lags) → write `cron_heartbeats`. Runtime budget < 50 s.

### `GET /api/health`
`200 { "db": "ok", "stripe": "ok", "sweepLagSeconds": 42 }` for the uptime monitor. `503` if the DB is unreachable or the sweep lags > 5 min. No secrets or PII.

## Error code catalogue (slice 1)
`validation_failed` 400 · `unauthenticated` 401 · `forbidden` 403 · `not_found` 404 · `conflict` 409 · `cart_changed` 409 · `ordering_closed` 409 · `not_cancellable` 409 · `accept_deadline_passed` 409 · `payment_not_captured` 409 · `idempotency_mismatch` 422 · `order_limit_exceeded` 422 · `refund_exceeds_captured` 422 · `until_required` 422 · `invalid_hours` 422 · `rate_limited` 429 · `payment_unavailable` 503 · `internal` 500.

## Compatibility
v1 changes are additive only (new optional fields, new endpoints, new error codes the UI treats as `internal`). Breaking changes need `/api/v2` and an ADR.
