import { describe, expect, it, vi } from "vitest";
import { createLogger } from "@/lib/logger";
import {
  PLACES_FIELD_MASK,
  reviewsResponse,
  reviewsStatusResponse,
  toReviewsDto,
  writeReviewUri,
} from "@/server/reviews/google-places";
import fixture from "../fixtures/google-place-details.json";

const log = createLogger({ sink: () => {} });
const PLACE = "ChIJTestPlaceId123";
const KEY = "AIzaTEST-not-a-real-key-000000";

describe("toReviewsDto", () => {
  const dto = toReviewsDto(fixture, PLACE);

  it("keeps rating, count and the Google Maps link", () => {
    expect(dto).toMatchObject({
      rating: 4.6,
      userRatingCount: 214,
      googleMapsUri: "https://maps.google.com/?cid=1234567890",
    });
    expect(dto.writeReviewUri).toBe(writeReviewUri(PLACE));
  });

  it("maps author attribution and text; falls back to originalText", () => {
    expect(dto.reviews[0]).toEqual({
      author: "Test Reviewer A",
      authorUri: "https://www.google.com/maps/contrib/1",
      rating: 5,
      relativeTime: "2 weeks ago",
      publishTime: "2026-10-15T09:00:00Z",
      text: "Test review one: lovely cutting chai and a warm welcome.",
      reviewUri: "https://www.google.com/maps/reviews/1",
    });
    expect(dto.reviews[1].text).toBe("Test review two: the vada pav was great.");
  });

  it("drops non-https links (no javascript: URLs reach the page)", () => {
    expect(dto.reviews[1].authorUri).toBeNull();
  });

  it("skips reviews without text, names missing authors, and shows at most 5", () => {
    expect(dto.reviews.map((r) => r.author)).toEqual(["Test Reviewer A", "Test Reviewer B", "A Google user", "E", "F"]);
  });

  it("tolerates an empty or odd response", () => {
    expect(toReviewsDto({}, PLACE)).toMatchObject({ rating: null, userRatingCount: null, reviews: [] });
    expect(toReviewsDto({ rating: "lots", reviews: "nope" }, PLACE)).toMatchObject({ rating: null, reviews: [] });
  });
});

describe("reviewsResponse (GET /api/v1/reviews)", () => {
  it("503 reviews_unavailable when not configured, without calling Google", async () => {
    const fetchFn = vi.fn();
    await expect(reviewsResponse({ apiKey: undefined, placeId: PLACE, log, fetchFn })).rejects.toMatchObject({
      code: "reviews_unavailable",
      status: 503,
    });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("sends the key in a header (never the URL) with a minimal field mask; never cached", async () => {
    const fetchFn = vi.fn(async () => Response.json(fixture));
    const res = await reviewsResponse({
      apiKey: KEY,
      placeId: PLACE,
      log,
      fetchFn: fetchFn as unknown as typeof fetch,
    });
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(`https://places.googleapis.com/v1/places/${PLACE}?languageCode=en`);
    expect(url).not.toContain(KEY);
    expect(init.headers).toMatchObject({ "X-Goog-Api-Key": KEY, "X-Goog-FieldMask": PLACES_FIELD_MASK });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(((await res.json()) as { reviews: unknown[] }).reviews).toHaveLength(5);
  });

  it.each([
    ["quota cap reached (429)", async () => new Response("quota", { status: 429 })],
    ["bad key (403)", async () => new Response("denied", { status: 403 })],
    ["network failure", async () => Promise.reject(new TypeError("fetch failed"))],
  ])("503 on %s", async (_label, impl) => {
    await expect(
      reviewsResponse({ apiKey: KEY, placeId: PLACE, log, fetchFn: vi.fn(impl) as unknown as typeof fetch }),
    ).rejects.toMatchObject({ code: "reviews_unavailable" });
  });
});

describe("reviewsStatusResponse (GET /api/v1/reviews/status)", () => {
  it.each([
    [undefined, undefined, false],
    [KEY, undefined, false],
    [undefined, PLACE, false],
    [KEY, PLACE, true],
  ])("key=%s place=%s → configured %s, without calling Google", async (apiKey, placeId, configured) => {
    const res = reviewsStatusResponse({ apiKey, placeId });
    expect(await res.json()).toEqual({ configured });
    expect(JSON.stringify(await reviewsStatusResponse({ apiKey, placeId }).json())).not.toContain("AIza");
  });
});
