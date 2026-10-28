# E. UI/UX Direction

Status: **Confirmed** by the project lead, 15 Oct 2026. Exact colour values are still to be sampled from the vector logo (Q13).

## 1. Concept — "The Tapri, after dark"

A tapri is a stall people gather around, and the chai glass is the ritual. Chai Tapri's real setting is warm timber, a maroon-and-cream badge, and a late-night (till 1am) Northbridge crowd. The site should feel like **standing at that counter**: warm, close, a little loud in its type, calm in its layout. It should not look like a delivery-app catalogue or a generic "Indian restaurant" template (mandalas, gold filigree, spice-market stock photos).

**Idea sentence:** *A chai counter you can order from: big honest type, warm timber tones, real food on plain ground, and one moment of steam.*

Competitor test: swap in another café's logo. If the site still works, it isn't specific enough. The specific elements are: cutting-chai glass sizes as the first choice in ordering, Hinglish micro-copy used sparingly ("Ek cutting?"), the live "open till 1am" status, and the chaiwala illustration used as a stamp rather than as decoration.

## 2. What we took from the references (principles, not copies)

| Reference | What it is (verified 14 Oct 2026) | Takeaway for Chai Tapri | Rejected |
|---|---|---|---|
| **threeui.com** | Gallery of Three.js/WebGL landing pages, heroes, shaders. Full sources are paywalled (Pro). Example: "Hanami" uses 3 WebGL renderers + Lenis, 3.6 MB assets. | Editorial storytelling structure (sections with one idea each), film-grain texture, wipe/ink reveals as *one* signature move, an "almanac" feel for hours and notices. | WebGL scenes, shaders, 3D: heavy on mid-range phones, battery-hungry, and irrelevant to ordering chai. |
| **tasteskill.dev** | Open-source "anti-slop" rule set (SKILL.md files) for AI-built frontends. | Adopt its bans: no gradients/glass/glows, no eyebrow pills, no icon-card rows, no monospace decoration, max 2 typefaces, ≤ 5 type sizes, one ground/ink/accent, **take colours from the subject**, real photos only, never put text over a headline image, animate only transform/opacity, reduced-motion fallback. | Its "≥ 8 moving elements" quota. Motion should be justified per element, and an ordering UI needs calm. Its blanket "cream + terracotta is an AI palette" ban is overridden here by its own rule to take colours from the subject: Chai Tapri's real badge *is* cream + maroon, so we use it deliberately and with discipline. |
| **21st.dev** | Registry of 12k+ React/Tailwind/shadcn components (Aceternity, Magic UI, Origin UI, Base UI…). | Use accessible primitives in the shadcn/Radix/Base UI style: bottom sheet/drawer for item detail, dialog, toast, segmented control (Pickup/Delivery), stepper/number input, radio-card groups for modifiers. Copy the source into the repo and restyle it. | Trending marketing blocks (beams, shimmer buttons, liquid metal, animated gradients, globe heroes). They are exactly the generic look to avoid. |
| **gsap.com** | GSAP + all plugins (ScrollTrigger, SplitText, Flip…) are now **free incl. commercial use** under Webflow's standard licence (proprietary, not OSS). Restriction only on tools competing with Webflow's visual builder. | Capable. Consider it only for a single scroll-linked "signature" sequence, if one is approved. | Not chosen by default. See §7. |

## 3. Typography direction

- **Display:** a characterful, heavy, slightly condensed grotesk or a sturdy slab, with the personality of hand-painted Indian shop signage but kept clean. Candidates to test: *Bricolage Grotesque* (OFL), *Anybody* (OFL, variable width), *Familjen Grotesk*. Set large, tight tracking (−0.02 to −0.04em), short lines.
- **Text/UI:** one highly legible sans for menu, prices and forms: *Inter* or *Geist* (OFL). Tabular figures for prices and times.
- **Optional Devanagari accent:** a small "चाय" mark in *Mukta* or *Hind*, used as a stamp only. It needs client sign-off for cultural fit and spelling.
- At most 2 families, ≤ 5 sizes per page. Body 16–18 px, line height 1.5, max ~70 characters per line.
- **No** script/"Indian" novelty fonts, no faux-Devanagari Latin fonts.

## 4. Colour strategy

Taken from the real brand and venue, not from a palette generator:

| Token | Role | Starting point (refine against the logo files) |
|---|---|---|
| `--ground` | Page background | Warm chai-milk cream, e.g. `#F4EBDD` |
| `--ink` | Text | Deep tea-brown, e.g. `#2A1A12` (not pure black) |
| `--accent` | **Actions only** (Order, Add, Pay) + the open-status dot | Tapri maroon/red from the logo, e.g. `#9E1B1E` (verify AA contrast on cream: must be ≥ 4.5:1 for button text) |
| `--surface` | Cards/sheets, separated by a tone step, not lines/shadows | One step darker than the ground, e.g. `#EADFCC` |
| `--night` | One full-bleed section (Visit / late-night) | Timber-dark brown, e.g. `#1E140F` with cream text |
| Status | Success/warn/error | Muted green / amber / the accent red, each with an icon and text (never colour alone) |

**Update 15 Oct 2026 (menu board seen):** the full-colour logo is **"CHAI" in saffron orange + "TAPRI" in deep maroon**, with an orange swash underline and "Northbridge" in spaced small caps. The chaiwala wears a **magenta/pink shirt** against a **sunshine-yellow disc**. The board uses a cream ground, grey condensed display caps for headings, thin pink-red rule boxes for extras, and a **maroon footer band**. Revised token plan: accent = the logo maroon (actions); a secondary *brand* colour = saffron orange, for the wordmark and at most one highlight (not buttons); the yellow and magenta live **only inside the illustration**, never as UI colours. Sample exact values from the vector logo when supplied (Q13).
The board's own heading style (tall condensed caps) is a good cue for the display typeface. Test a condensed grotesk against it before choosing.

Rules: a single accent; no gradients (except a neutral scrim if a photo ever carries text); a dark mode only if time allows (the "night" section gives contrast without one).

## 5. Photography approach

- Use the client's SmartShoot photos for **menu items** (after usage rights are confirmed), cut out as rows/thumbnails with consistent 1:1 or 4:5 crops. The marble ground is acceptable inside small crops. Keep the marble out of large layouts.
- Commission a **half-day atmosphere shoot** (chai pouring, steam, hands, interior, night shopfront, team) plus a 5–8 s silent loop for the hero. This is the biggest lever for "premium and authentic".
- Treatment: natural, warm, slight grain allowed. No heavy filters, duotones or AI-generated food.
- Every image gets real alt text ("Cutting chai in a small glass beside cinnamon sticks"). Decorative images use `alt=""`.

## 6. Layout & component principles

- One 12-column grid, 16–24 px mobile margins, generous section spacing (desktop 120–200 px). Left-aligned text with no centred-everything.
- Adjacent sections use different compositions (split image/text → full-bleed night band → list menu → map). No section is a plain card grid.
- Menu rows: photo thumb (left) + name/price (right) + one-line description. Tags as text labels, not emoji pills.
- Bottom sheets for item detail on mobile (thumb-reachable). Primary actions sit in the bottom 40% of the screen.
- Touch targets ≥ 44×44 px. Visible focus rings in the accent colour.
- Live status chip in the header (open / closing soon / paused / closed) is the only "badge-like" element.
- Empty, loading, error and closed states are designed, not left as defaults.

## 7. Motion guidance & library evaluation

Purposeful motion only:
1. **Signature move (one):** steam rising from the chai glass in the hero (a CSS/SVG loop, or the video itself), *or* a single masked wipe reveal of the hero headline. Not both.
2. **Feedback:** "Add" button press → the item count in the cart bar ticks up (scale/opacity, 150–200 ms). Toast for sold-out/price changes.
3. **Spatial:** bottom sheet slides up. Category bar underline moves with scroll-spy.
4. **Section entrances:** a single subtle rise + fade (16–24 px, 60–90 ms stagger), once per section, content visible without JS.
5. `prefers-reduced-motion`: remove travel and loops. Show the video poster frame.

| Option | Fit | Cost | Verdict |
|---|---|---|---|
| **CSS transitions + View Transitions API + IntersectionObserver** | Covers 1–5 above | ~0 KB | **Recommended default** |
| **Motion (motion.dev, MIT)** | React-native layout/presence animations (sheet, cart) | Small, tree-shakeable | Use if the React layout animations become fiddly |
| **GSAP** (free, Webflow licence) | Best for complex scroll-linked timelines | Core + ScrollTrigger add tens of KB | Only if the client approves a scroll-told "story" section on About |
| Three.js / WebGL | Not needed | Large | Rejected |
| Lenis smooth scroll | Hijacks native scroll and can hurt accessibility/mobile feel | — | Rejected |

## 8. Responsive & mobile usability

- Design mobile first at 360–390 px. Most orders will come from phones on the street or at home late at night.
- Sticky cart bar with total. Checkout uses large inputs and correct `inputmode`/`autocomplete` attributes (`tel`, `email`, `street-address`) so wallets and autofill work.
- Apple Pay / Google Pay shown first when available.
- Test one-handed use, outdoor glare (contrast), and slow 4G.

## 9. Explicit anti-patterns (design QA checklist)
No gradient blobs · no glassmorphism / backdrop-blur nav · no floating pill nav · no eyebrow pill labels · no rows of icon cards · no "01/02/03" numbering · no stock spice-market photos · no mandala/paisley wallpaper · no auto-playing sound · no carousels for core content · no hero text over busy photos · no more than one accent colour.

## Revision, 29 Oct 2026: "the tapri wall" (client feedback)

The client found the first build too plain and asked for a site that is **playful and informative and feels like the shop**. They shared photos of the enamel tin signs on the shop walls. Changes to the rules above:

- **Visual language:** original enamel "tin signs" (rusty worn edge, four screw holes, soft wall shadow) in the shop's sign palette: cream, Tapri red, saffron, mustard `#E9B949`, teal `#1E5A52`. More than one colour now carries large signs; red stays the only colour for actions (Add, Order). Contrast checked for every text pairing (see `globals.css`).
- **Logo + colours:** the client's logo is now in the header (mark + wordmark) and footer (full lockup on a cream sign). Brand orange `#F47D03` and maroon `#6C2D27` are sampled from it; the footer band uses the maroon.
- **Type:** Bricolage Grotesque's width axis gives condensed, uppercase sign lettering (`.font-sign`) without a third family.
- **Motion (CSS only, no libraries, off for reduced motion):** steam rising from the chai photo, the door sign swinging once on load, a scrolling street-banner strip, a bump on the cart count. The rule "≥ 8 moving elements" is still rejected; each motion has a reason.
- **Informative content:** a "Chai 101" wall explains cutting, tapri, bun maska and vada pav, with real prices from the board. Copy is draft for the owner's sign-off; dish explanations are general, not recipe claims.
- **Not used:** the photos of the third-party posters in the shop (film stills, an artist-signed print, mass-market designs). Reproducing them online risks copyright and personality-rights claims. The signs on the site are original and belong to Chai Tapri. If the owner wants the real interior on the site, the planned atmosphere shoot (§5) is the way to do it.

