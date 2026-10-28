/**
 * Google reviews via the Places API (New), Place Details (ADR-0013).
 *
 * Google's terms: no caching or storing of Places content except the Place ID, so this fetches on
 * demand (the page asks only when a visitor taps "Show Google reviews") and responses are
 * `no-store`. Attribution (author names + links, "Google") is shown by the UI. Up to 5 reviews,
 * selected by Google. The key travels in a header, never in a URL, and never reaches the browser.
 */
import { z } from "zod";
import { ApiError } from "@/lib/errors";
import type { Logger } from "@/lib/logger";

export const PLACES_FIELD_MASK = "rating,userRatingCount,reviews,googleMapsUri";
const TIMEOUT_MS = 8_000; // SECURITY.md: third-party timeouts ≤ 8 s

export interface ReviewDto {
  author: string;
  authorUri: string | null;
  rating: number | null;
  relativeTime: string | null;
  publishTime: string | null;
  text: string;
  reviewUri: string | null;
}

export interface ReviewsDto {
  rating: number | null;
  userRatingCount: number | null;
  reviews: ReviewDto[];
  googleMapsUri: string | null;
  writeReviewUri: string;
}

const httpsUrl = z
  .string()
  .url()
  .refine((u) => u.startsWith("https://"))
  .optional()
  .catch(undefined);

const placeSchema = z.object({
  rating: z.number().min(0).max(5).optional().catch(undefined),
  userRatingCount: z.number().int().nonnegative().optional().catch(undefined),
  googleMapsUri: httpsUrl,
  reviews: z
    .array(
      z.object({
        rating: z.number().min(0).max(5).optional().catch(undefined),
        relativePublishTimeDescription: z.string().optional().catch(undefined),
        publishTime: z.string().optional().catch(undefined),
        googleMapsUri: httpsUrl,
        text: z.object({ text: z.string() }).optional().catch(undefined),
        originalText: z.object({ text: z.string() }).optional().catch(undefined),
        authorAttribution: z.object({ displayName: z.string().optional(), uri: httpsUrl }).optional().catch(undefined),
      }),
    )
    .optional()
    .catch([]),
});

/** Google's documented "write a review" link for a Place ID. */
export function writeReviewUri(placeId: string): string {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId)}`;
}

/** Maps a Place Details response to what the page shows. Reviews without text are dropped. */
export function toReviewsDto(raw: unknown, placeId: string): ReviewsDto {
  const place = placeSchema.parse(raw ?? {});
  return {
    rating: place.rating ?? null,
    userRatingCount: place.userRatingCount ?? null,
    googleMapsUri: place.googleMapsUri ?? null,
    writeReviewUri: writeReviewUri(placeId),
    reviews: (place.reviews ?? [])
      .map((r) => ({
        author: r.authorAttribution?.displayName?.trim() || "A Google user",
        authorUri: r.authorAttribution?.uri ?? null,
        rating: r.rating ?? null,
        relativeTime: r.relativePublishTimeDescription ?? null,
        publishTime: r.publishTime ?? null,
        text: (r.text?.text ?? r.originalText?.text ?? "").trim(),
        reviewUri: r.googleMapsUri ?? null,
      }))
      .filter((r) => r.text.length > 0)
      .slice(0, 5),
  };
}

/**
 * GET /api/v1/reviews/status: whether live reviews can be offered. Never calls Google (free), so the
 * page can hide "Show Google reviews" until a key is configured.
 */
export function reviewsStatusResponse({
  apiKey,
  placeId,
}: {
  apiKey: string | undefined;
  placeId: string | undefined;
}) {
  return Response.json(
    { configured: Boolean(apiKey && placeId) },
    { headers: { "cache-control": "public, max-age=300" } },
  );
}

export interface ReviewsDeps {
  apiKey: string | undefined;
  placeId: string | undefined;
  log: Logger;
  fetchFn?: typeof fetch;
}

/** GET /api/v1/reviews. 503 reviews_unavailable when not configured or Google fails. */
export async function reviewsResponse({ apiKey, placeId, log, fetchFn = fetch }: ReviewsDeps): Promise<Response> {
  if (!apiKey || !placeId) {
    log.info("reviews: Google Places not configured");
    throw new ApiError("reviews_unavailable");
  }
  let res: Response;
  try {
    res = await fetchFn(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=en`, {
      headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": PLACES_FIELD_MASK },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    log.warn("reviews: Google Places request failed", { err });
    throw new ApiError("reviews_unavailable");
  }
  if (!res.ok) {
    // 429 = the daily quota cap set in Google Cloud was reached: by design, not an outage.
    log.warn("reviews: Google Places error", { status: res.status });
    throw new ApiError("reviews_unavailable");
  }
  const dto = toReviewsDto(await res.json().catch(() => ({})), placeId);
  return Response.json(dto, { headers: { "cache-control": "no-store" } });
}
