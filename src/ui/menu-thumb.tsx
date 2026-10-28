import Image from "next/image";
import type { MenuItem } from "@/domain/menu";
import { photoFor } from "@/domain/menu-photos";

/**
 * Square photo thumbnail for a menu row, or nothing if the item has no processed photo.
 * `alt=""`: the item name is the adjacent text, so the photo is decorative here (no double reading).
 */
export function MenuThumb({ item, className = "size-20 sm:size-24" }: { item: MenuItem; className?: string }) {
  const photo = photoFor(item);
  if (!photo) return null;
  return (
    <span className={`bg-surface relative block shrink-0 overflow-hidden rounded-md ${className}`}>
      <Image src={photo.src} alt="" fill sizes="(min-width: 640px) 96px, 80px" className="object-cover" />
    </span>
  );
}
