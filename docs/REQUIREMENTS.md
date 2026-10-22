# C. Product Requirements Document

Status key: **Confirmed** (stated in the project brief, 14 Oct 2026) · **Proposed** (my recommendation, needs approval) · **Open** (needs a client answer). Scope tag: `MVP` · `Later` · `Out`.
Business rules (hours, pricing, lifecycle) live in `BUSINESS_RULES.md` and are referenced as BR-x.

## 1. Purpose & goals

- **G1 (Confirmed):** an informative business website for Chai Tapri, Northbridge.
- **G2 (Confirmed):** a direct online food-ordering platform (pickup, plus delivery through Uber Direct).
- **G3 (Confirmed):** the architecture must allow merchandise and other products later, without building a generic commerce platform now.
- **G4 (Proposed):** measurable goals, e.g. % of online orders placed direct vs marketplace, average order value, checkout conversion, Core Web Vitals "good" on mobile. Targets need to be set with the client.

## 2. Users & roles

| Role | Description | Status |
|---|---|---|
| Guest customer | Browses, orders with guest checkout (name, mobile, email) | Proposed MVP |
| Registered customer | Saved details and order history | Proposed `Later` (not needed to launch) |
| Staff | Sees incoming orders, marks items sold out, pauses ordering | Proposed MVP |
| Manager | Staff rights plus hours, closures, menu edits, refunds | Proposed MVP |
| Owner/Admin | Everything plus staff accounts, integrations, settings | Proposed MVP |

## 3. Confirmed requirements

| ID | Requirement | Scope |
|---|---|---|
| REQ-001 | Pages: Home, About, Menu, Google Reviews, Contact & Location, Privacy Policy, Terms & Conditions, other relevant business info | MVP |
| REQ-002 | Customers can order food online from the website | MVP |
| REQ-003 | Configurable ordering schedules and order time slots | MVP |
| REQ-004 | Staff manage opening hours and operating schedules manually | MVP |
| REQ-005 | Staff control whether online orders are currently accepted | MVP |
| REQ-006 | Ordering availability follows configured hours automatically | MVP |
| REQ-007 | Authorised staff can override availability (temporary closure / can't accept orders) | MVP |
| REQ-008 | Integration with the client's POS. **POS not chosen yet (15 Oct 2026)** | `Later`, once a POS is chosen. MVP uses the staff order board (REQ-040) |
| REQ-009 | Uber Direct delivery fulfilment. The client already uses Uber Direct. **The customer pays the delivery fee** (15 Oct 2026) | MVP, subject to API access (F3) and the minimum-order/distance rules (F2) |
| REQ-012 | **Staff accept or decline every online order** (15 Oct 2026) | MVP |
| REQ-013 | **Same-day orders only.** No ordering for another day (15 Oct 2026) | MVP |
| REQ-014 | Online ordering **stops automatically each night**. The **owner can open or close online ordering manually at any time**, including keeping it open past the cut-off (15 Oct 2026) | MVP |
| REQ-015 | Website prices = in-store menu board prices (15 Oct 2026, MENU.md) | MVP |
| REQ-010 | Online payment through a provider to be selected | MVP |
| REQ-011 | Architecture can extend to merchandise | Design constraint |

## 4. Recommended MVP features (Proposed)

**Customer**
- REQ-020 Menu with categories, item detail, photo, description, price, dietary tags, allergen info. One-page menu with a sticky category bar.
- REQ-021 Modifiers: required single-choice (e.g. chai size Cutting/Regular), optional add-ons (e.g. extra cheese) with min/max rules.
- REQ-022 Cart with server-calculated totals. Prices shown GST-inclusive. Delivery fee shown before payment.
- REQ-023 Fulfilment choice: Pickup (default) or Delivery (when available for the address and time).
- REQ-024 Time selection: ASAP (when open), and possibly a later time **today** (F6 open). No future days (REQ-013).
- REQ-025 Guest checkout: name, mobile, email, delivery address with autocomplete, delivery instructions, order notes.
- REQ-026 Payment: cards, Apple Pay, Google Pay. Card surcharges are **not** allowed (RBA rule from 1 Oct 2026, see COMPLIANCE.md).
- REQ-027 Confirmation page and email with order number, items, total, pickup time/ETA, store address/map link, and GST tax-invoice details.
- REQ-028 Order status page (unguessable link): waiting for the shop to accept → accepted (ready at HH:MM) → ready / out for delivery (with the Uber tracking link) → completed, or declined (with reason, "you have not been charged").
- REQ-029 Clear "closed / ordering paused / delivery unavailable" states, with the next available time.
- REQ-030 Google rating summary and selected reviews, compliant with Google's attribution rules (see INTEGRATIONS.md §5).
- REQ-031 Contact & Location: map, hours (from the same data as ordering), phone, Instagram, accessibility and transport notes.

**Staff/admin**
- REQ-040 **Live order board — MVP-critical.** New-order sound and banner, Accept (confirm ready time) / Decline (reason), escalation when an order is unaccepted, Ready, Collected, delivery status. Usable on a counter tablet or phone. Optional docket printer. It is the kitchen's source of truth until a POS is integrated.
- REQ-041 Owner controls: **Open now until HH:MM** / **Close now** (15/30/60 min, until the cut-off, until reopened), "Keep open past cut-off", delivery-only off switch. Staff can only Close.
- REQ-042 Weekly hours, separate ordering windows, holiday/special-date exceptions, scheduled future changes.
- REQ-043 Item/modifier sold-out toggles (if the POS doesn't own availability).
- REQ-044 Menu content editing for web fields (photo, description, allergens, tags, display order). Prices/items are edited here only if the POS isn't the master.
- REQ-045 Site notices/banners (e.g. "Closed for Diwali, back Thursday") with start/end time.
- REQ-046 Refund (full/partial) from the admin, routed through the payment provider. Manager+ only.
- REQ-047 Integration health panel: last POS sync, failed POS submissions, Uber Direct failures, webhook errors. Alerts by email/SMS.
- REQ-048 Staff accounts with roles, MFA for Manager/Owner, audit log of sensitive actions.

## 5. Optional enhancements (Later)

- Customer accounts, reorder, saved addresses · loyalty / stamp card · promo codes · SMS order notifications · catering/bulk pre-orders with deposits · gift cards · merchandise shop (chai masala packs, glasses, tees) · table QR ordering · Google Business Profile hours sync via API · multi-language (Hindi/Gujarati) · analytics dashboard · Instagram feed embed.

## 6. Exclusions (Out of scope for first release)

- Native mobile apps · own delivery-driver management · marketplace (multi-vendor) features · cash on delivery · table reservations · building a custom POS or KDS · two-way sync with Uber Eats/DoorDash marketplace menus.

## 7. Non-functional requirements (Proposed targets)

| ID | Target |
|---|---|
| NFR-01 Performance | Mobile LCP < 2.5 s and INP < 200 ms at p75 (Core Web Vitals "good"). Menu page JS < 150 KB gz. |
| NFR-02 Availability | 99.9% monthly for ordering. When a third party fails, the site degrades: delivery → pickup only, POS → admin order board plus alert. |
| NFR-03 Correctness | Zero duplicate charges or duplicate kitchen orders from retries (idempotency, proven by tests). |
| NFR-04 Accessibility | WCAG 2.2 AA (target, not a legal certification). |
| NFR-05 Security | OWASP ASVS L2 controls for auth/admin. PCI DSS SAQ-A scope (no card data touches our servers). |
| NFR-06 Privacy | Collect the minimum personal data. Delete or anonymise order personal data after the agreed retention period (proposal: 24 months; tax records kept 5 years without needing personal data beyond the invoice). |
| NFR-07 Time | All times displayed and calculated in Australia/Perth (UTC+8, no daylight saving). Stored in UTC. |
| NFR-08 Browsers | Last 2 versions of Safari iOS, Chrome Android, Chrome/Edge/Firefox/Safari desktop. |
| NFR-09 Recovery | RPO ≤ 24 h (≤ 5 min if PITR is bought). RTO ≤ 4 h. |

## 8. Open questions affecting requirements
See `CLIENT_QUESTIONS.md`, especially F1–F7 (delivery fee method, minimum order, Uber API access, prep time, cut-off, later-today orders, acceptance time limit), Q6 (legal entity) and Q10 (allergens).
