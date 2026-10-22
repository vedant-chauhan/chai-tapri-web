/**
 * Pre-resized menu photo variants (PHASE-4-FOUNDATION §3 "Images", ADR-0010).
 * `pnpm images` writes `public/menu/<slug>-<width>.<format>`; the custom next/image loader
 * picks a width from this list. Shared so the script and the loader can't drift apart.
 */
export const MENU_IMAGE_WIDTHS = [360, 720, 1080, 1440] as const;
export const MENU_IMAGE_FORMATS = ["avif", "webp"] as const;
export const MENU_IMAGE_DIR = "/menu";

export type MenuImageFormat = (typeof MENU_IMAGE_FORMATS)[number];

/** Smallest variant at least `width` wide (the largest if none is). */
export function pickVariantWidth(width: number): number {
  return MENU_IMAGE_WIDTHS.find((w) => w >= width) ?? MENU_IMAGE_WIDTHS[MENU_IMAGE_WIDTHS.length - 1];
}

/** Public URL of one variant, e.g. `/menu/masala-chai-720.webp`. */
export function menuImageUrl(slug: string, width: number, format: MenuImageFormat = "webp"): string {
  return `${MENU_IMAGE_DIR}/${slug}-${pickVariantWidth(width)}.${format}`;
}
