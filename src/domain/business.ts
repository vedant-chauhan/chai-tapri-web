/**
 * Public business details. Only [Verified] facts (docs/discovery/A-business-research.md §2).
 * Legal name / ABN are NOT here: unconfirmed (CLIENT_QUESTIONS Q6), a launch blocker.
 */
export const BUSINESS = {
  name: "Chai Tapri",
  suburb: "Northbridge",
  addressLines: ["Shop 6/189 William St", "Northbridge WA 6003"],
  address: "Shop 6/189 William St, Northbridge WA 6003",
  /** Public number on Google and Instagram. */
  phone: { display: "0481 257 595", href: "tel:+61481257595" },
  instagram: { handle: "@chaitapri.perth", url: "https://www.instagram.com/chaitapri.perth/" },
  /** Universal Google Maps link (no embed: keeps CSP strict and avoids loading Google on page view). */
  directionsUrl:
    "https://www.google.com/maps/search/?api=1&query=Chai%20Tapri%2C%20189%20William%20St%2C%20Northbridge%20WA%206003",
  /** City of Perth listing (S1). */
  tagline: "Crazy for chai – good vibes, loud conversations, hot chai.",
  /** Google Business Profile coordinates (A-business-research §2, [Verified]). */
  coordinates: { lat: -31.94923, lng: 115.85867 },
  /** Google rating as checked 14 Oct 2026 (A-business-research §3). Dated on purpose: it changes. */
  googleRating: { stars: 4.6, reviews: 197, checked: "October 2026" },
} as const;

/**
 * Embedded map: OpenStreetMap (no API key, no tracking cookies). Google Maps' official embed needs
 * a Google Cloud API key the owner doesn't have yet; swap here if that changes.
 */
export const MAP_EMBED = {
  origin: "https://www.openstreetmap.org",
  url: (() => {
    const { lat, lng } = BUSINESS.coordinates;
    const dLat = 0.0032;
    const dLng = 0.0045;
    const bbox = [lng - dLng, lat - dLat, lng + dLng, lat + dLat].map((n) => n.toFixed(5)).join(",");
    return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
  })(),
  attributionUrl: "https://www.openstreetmap.org/copyright",
} as const;

/**
 * The franchise enquiry Google Form (CLIENT_QUESTIONS F14). Paste the form's "Send → embed" URL
 * (https://docs.google.com/forms/d/e/…/viewform?embedded=true) here; until then the page shows a
 * contact fallback. The CSP allows docs.google.com frames only when this is set.
 */
export const FRANCHISE_FORM_URL: string | null = null;
