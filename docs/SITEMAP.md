# D. Sitemap & Page Specifications

All content below is `[Recommendation]` unless noted.

## Principles
- **Ordering is the primary job.** "Order" stays reachable in one tap on every page (header button, plus a sticky bottom bar on mobile menu pages).
- **The menu doubles as the ordering surface.** One menu, not a separate "Menu" brochure page *and* an "Order" page. Before ordering opens, the same page shows prices and a disabled "Add" with the reason ("Opens 11am" / "Orders paused").
- **Few pages, done well.** The site is small, so avoid stub pages.

## Sitemap

```
/                       Home
/menu                   Menu & Order        (category anchors: #chai #bun-maska #vada-pav ...)
/menu/[item-slug]       Item detail          (modal on top of /menu; real URL for sharing/SEO)
/checkout               Checkout             (cart review → details → time → payment)
/order/[token]          Order status         (unguessable token, no login)
/about                  Our Story
/visit                  Visit & Contact      (location, hours, map, phone, Instagram, FAQs)
/reviews                → section on Home + /visit; a separate page only if content warrants it
/legal/privacy          Privacy Policy
/legal/terms            Terms & Conditions   (incl. ordering, refunds, delivery terms)
/legal/allergens        Allergen & Dietary Information
/admin/...              Staff area (noindex, auth required)
404 / 500 / closed states
Later: /shop (merchandise), /catering, /account
```

**Navigation (desktop):** wordmark · Menu · Our Story · Visit · [Order now] (one accent button). Header shows open status: "Open · until 1am" / "Closed · opens Wed 11am".
**Navigation (mobile):** wordmark + status + "Order" button. Menu icon opens Menu / Story / Visit / Instagram. **No hamburger-only ordering.**
**Footer:** address, today's hours and the full week, phone, Instagram, legal links, ABN, large closing wordmark.

## Page specifications

### Home `/`
Role: say what this is in 3 seconds, prove it with food and atmosphere, route to ordering.
1. **Hero:** headline (≤ 2 lines, e.g. "Cutting chai & Bombay street snacks in Northbridge"), live status line (open/closed/paused with the next opening time), primary CTA **Order for pickup**, secondary CTA **See the menu**. Media: a chai-pour video or interior image (to be shot). Interim: a tight crop of Masala Chai / Vada Pav.
2. **"What's a tapri?"** two-sentence brand statement + one strong image (interior/people when available).
3. **Signature items:** 3–4 hero dishes (Masala Chai, Bun Maska, Vada Pav, Samosa), each a direct "Add" entry into the menu. Use an asymmetric editorial layout, **not** a uniform 4-card grid.
4. **Reviews:** rating 4.6 from N Google reviews (live data) + 2–3 attributed reviews + "Read all on Google".
5. **Visit:** map snippet, address, today's hours, late Fri/Sat, "Get directions".
6. **Instagram / community strip** (optional, curated reels with permission).
Primary CTA: Order for pickup.

### Menu & Order `/menu`
Role: browse and order quickly, mostly on phones.
- Sticky category bar (scroll-spy), live status banner, fulfilment toggle (Pickup / Delivery) and time chip ("ASAP ~15 min" / "Today 7:30pm").
- Each category: title, optional one-line intro, items as rows (photo, name, short description, dietary tags, price, "+" button). **A list layout, not a card grid.** Faster to scan, and it avoids the repeated-card look.
- Chai shown as one product with size and flavour choices (no four near-identical photos).
- Item sheet (bottom sheet on mobile, dialog on desktop): large photo, description, allergens, modifiers with clear required/optional and min/max, quantity, a live price, "Add to order".
- Cart: a bottom bar on mobile (count + total + "Review order"), a side panel on desktop.
- Sold-out items stay visible but are disabled ("Sold out today").
Primary CTA: Add / Review order.

### Checkout `/checkout`
One page in steps, not separate pages: **1 Order review → 2 Pickup/Delivery & time → 3 Your details → 4 Payment.**
- Totals from the server only: items, delivery fee (from the Uber quote), discounts, total, "includes GST of $x".
- The time picker shows only valid slots and re-checks availability on submit.
- Delivery address autocomplete. If the address can't be delivered to, explain why and offer pickup.
- Payment Element / wallet buttons. Terms + privacy acknowledgement. Optional marketing opt-in (unticked).
- Error states: slot taken, shop paused mid-checkout, price changed, payment failed, quote expired. Each has a specific message and a recovery action.

### Order status `/order/[token]`
Live status timeline, pickup instructions ("Come to the counter, show order #A123"), Uber tracking link for delivery, contact phone, receipt/tax invoice download.

### Our Story `/about`
Founders, the tapri idea, recipes and origins, the Northbridge spot, team photo. A long-form editorial layout with 1–2 large images. CTA: Visit / Order.

### Visit & Contact `/visit`
Map, address with "Shop 6" wayfinding (how to find the shop within 189 William St), hours table (same data source as ordering), holiday notices, phone, Instagram, nearest train/bus (Perth Station, a short walk), parking notes, accessibility info, FAQ (dine-in vs takeaway, vegetarian?, allergens, catering?). Contact form is **Later**. Phone + Instagram DM are enough at launch.

### Legal pages
Privacy Policy, Terms & Conditions (ordering, payment, cancellations, refunds per ACL, delivery by a third party), Allergen statement. **Drafted by or reviewed by a qualified professional** (see COMPLIANCE.md).

### Admin `/admin`
Dashboard (today's orders, status, ordering on/off) · Orders · Menu & availability · Hours & closures · Notices · Settings (fulfilment, delivery radius/min order, slot capacity) · Integrations health · Staff & roles · Audit log.
