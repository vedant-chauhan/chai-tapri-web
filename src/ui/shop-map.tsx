import { BUSINESS, MAP_EMBED } from "@/domain/business";

/**
 * Embedded map with the shop pinned (OpenStreetMap, no key, no tracking cookies). Lazy: the
 * iframe loads only when it scrolls near the viewport, so it never slows the first paint.
 */
export function ShopMap({ className = "", height = "h-72 sm:h-80" }: { className?: string; height?: string }) {
  return (
    <figure className={`tin tin-paper p-3 ${className}`}>
      <iframe
        src={MAP_EMBED.url}
        title={`Map showing Chai Tapri at ${BUSINESS.address}`}
        loading="lazy"
        referrerPolicy="no-referrer"
        className={`w-full rounded-lg border-0 ${height}`}
      />
      <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-1 pt-3 text-sm">
        <a href={BUSINESS.directionsUrl} className="inline-flex min-h-11 items-center font-semibold underline">
          Get directions in Google Maps
        </a>
        <span className="text-ink-soft">
          Map ©{" "}
          <a href={MAP_EMBED.attributionUrl} className="underline">
            OpenStreetMap contributors
          </a>
        </span>
      </figcaption>
    </figure>
  );
}
