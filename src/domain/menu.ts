/**
 * Menu master data, transcribed from the client's menu board (docs/MENU.md, "Confirmed as
 * transcribed", 15 Oct 2026). Website prices = in-store prices (Q4). Integer cents, AUD.
 *
 * Used now for the browse-only menu; slice 1 turns it into the catalogue seed (DATABASE.md §6)
 * so the data is written once. Not here on purpose: item descriptions, allergens and combo choices
 * (CLIENT_QUESTIONS F11, Q10; MENU.md "Open menu questions") — never invent them.
 */

export interface PriceChoice {
  /** e.g. "Cutting" / "Regular", "Raw" / "Grilled". */
  label: string;
  priceCents: number;
}

export interface MenuItem {
  slug: string;
  name: string;
  /** Single price, or a required choice (size/style) with its own prices. */
  price: { kind: "single"; cents: number } | { kind: "choice"; group: string; choices: PriceChoice[] };
  /** Photo slug once the owner's photos are processed (`pnpm images`); null = text-only row. */
  photo: string | null;
}

export interface Extra {
  name: string;
  priceCents: number;
}

export interface MenuCategory {
  slug: string;
  name: string;
  /** One-line intro, only where the business has said it (Google profile, menu board). */
  intro?: string;
  items: MenuItem[];
  extras: Extra[];
}

const EXTRA_CHEESE: Extra = { name: "Extra cheese", priceCents: 200 };
const EXTRA_CHUTNEY: Extra = { name: "Extra chutney", priceCents: 150 };

const single = (cents: number) => ({ kind: "single" as const, cents });
const sized = (cutting: number | null, regular: number) => ({
  kind: "choice" as const,
  group: "Size",
  choices: [
    ...(cutting === null ? [] : [{ label: "Cutting", priceCents: cutting }]),
    { label: "Regular", priceCents: regular },
  ],
});
const styled = (raw: number, grilled: number) => ({
  kind: "choice" as const,
  group: "Style",
  choices: [
    { label: "Raw", priceCents: raw },
    { label: "Grilled", priceCents: grilled },
  ],
});

export const MENU: MenuCategory[] = [
  {
    slug: "chai",
    name: "Signature Chai & Hot Drinks",
    // Owner's description on the Google Business Profile (A-business-research §2, [Verified]).
    intro: "Cutting chai brewed fresh with spices, in Cutting and Regular sizes.",
    items: [
      { slug: "masala-chai", name: "Masala Chai", price: sized(449, 549), photo: "masala-chai" },
      { slug: "ginger-chai", name: "Ginger Chai", price: sized(449, 549), photo: "ginger-chai" },
      { slug: "cardamom-chai", name: "Cardamom Chai", price: sized(449, 549), photo: "cardamom-chai" },
      { slug: "pudina-chai", name: "Pudina Chai", price: sized(449, 549), photo: "pudina-chai" },
      { slug: "bournvita", name: "Bournvita", price: sized(null, 549), photo: null },
    ],
    extras: [],
  },
  {
    slug: "puffs",
    name: "Puff Pastry Range",
    items: [
      { slug: "classic-potato-puff", name: "Classic Potato Puff", price: single(690), photo: null },
      { slug: "schezwan-puff", name: "Schezwan Puff", price: single(790), photo: null },
      { slug: "veg-loaded-puff", name: "Veg Loaded Puff", price: single(990), photo: "veg-loaded-puff" },
      { slug: "tapri-special-puff", name: "Tapri Special Puff", price: single(1190), photo: "tapri-special-puff" },
    ],
    extras: [EXTRA_CHEESE, EXTRA_CHUTNEY],
  },
  {
    slug: "vada-pav",
    name: "Mumbai Street Snacks",
    items: [
      { slug: "classic-vada-pav", name: "Classic Vada Pav", price: single(749), photo: "classic-vada-pav" },
      { slug: "bombay-vada-pav", name: "Bombay Vada Pav", price: single(749), photo: "bombay-vada-pav" },
      { slug: "cheese-vada-pav", name: "Cheese Vada Pav", price: single(900), photo: null },
    ],
    extras: [EXTRA_CHEESE, EXTRA_CHUTNEY],
  },
  {
    slug: "samosa",
    name: "Samosa Corner",
    items: [
      { slug: "single-samosa", name: "Single Samosa", price: single(490), photo: "single-samosa" },
      { slug: "double-samosa", name: "Double Samosa", price: single(890), photo: "double-samosa" },
    ],
    extras: [EXTRA_CHUTNEY],
  },
  {
    slug: "sandwiches",
    name: "Toasted & Grilled Sandwiches",
    items: [
      { slug: "cheese-chutney-sandwich", name: "Cheese Chutney Sandwich", price: styled(790, 990), photo: null },
      { slug: "veg-sandwich", name: "Veg Sandwich", price: styled(790, 990), photo: "veg-grilled-sandwich" },
      { slug: "sweet-corn-capsicum-sandwich", name: "Sweet Corn Capsicum Sandwich", price: single(1300), photo: null },
      { slug: "club-sandwich", name: "Club Sandwich", price: single(1490), photo: "club-sandwich" },
      {
        slug: "chefs-special-sandwich",
        name: "Chef's Special Sandwich",
        price: single(1590),
        photo: "chefs-special-sandwich",
      },
    ],
    extras: [EXTRA_CHEESE, EXTRA_CHUTNEY],
  },
  {
    slug: "maggi",
    name: "Maggi Station",
    items: [
      { slug: "plain-maggi", name: "Plain Maggi", price: single(990), photo: null },
      { slug: "veg-maggi", name: "Veg Maggi", price: single(1190), photo: "veg-maggi" },
      { slug: "aglio-olio-maggi", name: "Aglio Olio Maggi", price: single(1190), photo: null },
    ],
    extras: [],
  },
  {
    slug: "bun-maska",
    name: "Bun Maska",
    items: [
      { slug: "classic-bun-maska", name: "Classic Bun Maska", price: single(600), photo: "classic-bun-maska" },
      { slug: "jam-bun-maska", name: "Jam Bun Maska", price: single(650), photo: "jam-bun-maska" },
      { slug: "nutella-bun-maska", name: "Nutella Bun Maska", price: single(750), photo: "nutella-bun-maska" },
    ],
    extras: [],
  },
  {
    slug: "lassi",
    name: "Lassi",
    items: [
      { slug: "rose-lassi", name: "Rose Lassi", price: single(799), photo: "rose-lassi" },
      { slug: "mango-lassi", name: "Mango Lassi", price: single(799), photo: "mango-lassi" },
    ],
    extras: [],
  },
  {
    slug: "street-specials",
    name: "Street Specials",
    items: [
      // Client's spelling kept ("Chat"), MENU.md open question 6.
      { slug: "kurkure-chat", name: "Kurkure Chat", price: single(900), photo: "kurkure-chat" },
      { slug: "masala-pav", name: "Masala Pav", price: single(849), photo: null },
    ],
    extras: [EXTRA_CHEESE, EXTRA_CHUTNEY],
  },
  {
    slug: "cold-drinks",
    name: "Cold Drinks & Refreshers",
    // Text only: no soft-drink brand artwork (MENU.md).
    items: [
      { slug: "pepsi-max", name: "Pepsi Max", price: single(349), photo: null },
      { slug: "coca-cola", name: "Coca Cola", price: single(349), photo: null },
      { slug: "solo", name: "Solo", price: single(349), photo: null },
      { slug: "sunkist", name: "Sunkist", price: single(349), photo: null },
      { slug: "water", name: "Water", price: single(249), photo: null },
    ],
    extras: [],
  },
  {
    slug: "combos",
    name: "Tapri Combos",
    // Combo choices (which chai, which sandwich/drink) pending F11; shown as fixed-price items.
    items: [
      { slug: "cutting-chai-bun-maska", name: "Cutting Chai + Bun Maska", price: single(949), photo: null },
      { slug: "cutting-chai-samosa", name: "Cutting Chai + Samosa", price: single(849), photo: null },
      { slug: "grilled-sandwich-drink", name: "Grilled Sandwich + Drink", price: single(1599), photo: null },
    ],
    extras: [],
  },
];

/** Shown under the menu, as printed on the board footer. */
export const MENU_BOARD_NOTE = "All items prepared fresh · Dine in & takeaway available.";

/** "$4.49" (AUD, always two decimals, as on the board). */
export function formatPrice(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0) throw new RangeError(`Invalid price: ${cents}`);
  return `$${(cents / 100).toFixed(2)}`;
}

/** Lowest price of an item, for "from $4.49". */
export function lowestPriceCents(item: MenuItem): number {
  return item.price.kind === "single" ? item.price.cents : Math.min(...item.price.choices.map((c) => c.priceCents));
}

export function findItem(slug: string): MenuItem | undefined {
  return MENU.flatMap((c) => c.items).find((i) => i.slug === slug);
}
