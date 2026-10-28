/**
 * Which menu photos exist, written by `pnpm images` (scripts/images.ts → menu-photos.json).
 * Empty until the owner's photos are processed: rows render text-only, nothing breaks.
 */
import index from "./menu-photos.json";
import type { MenuItem } from "./menu";

export interface PhotoSize {
  width: number;
  height: number;
}

const PHOTOS = index as Record<string, PhotoSize>;

/** The photo for an item, if it has one and it has been processed. */
export function photoFor(item: Pick<MenuItem, "photo">): (PhotoSize & { src: string }) | null {
  if (!item.photo) return null;
  const size = PHOTOS[item.photo];
  return size ? { ...size, src: `/menu/${item.photo}` } : null;
}
