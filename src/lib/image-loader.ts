"use client";

import { MENU_IMAGE_DIR, menuImageUrl } from "./image-variants";

/**
 * Custom next/image loader: no image optimisation service (ADR-0010).
 * Menu photos are referenced by slug, `src="/menu/masala-chai"`, and resolve to the nearest
 * pre-resized WebP variant. Slice 1 can add an AVIF <source> via getImageProps. Any other
 * src (logos, icons) is served as-is.
 */
export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }): string {
  const prefix = `${MENU_IMAGE_DIR}/`;
  if (src.startsWith(prefix) && !/\.[a-z0-9]+$/i.test(src)) {
    return menuImageUrl(src.slice(prefix.length), width);
  }
  return src;
}
