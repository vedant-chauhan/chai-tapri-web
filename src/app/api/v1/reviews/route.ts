import { getEnv } from "@/lib/env";
import { handleRequest } from "@/server/http";
import { reviewsResponse } from "@/server/reviews/google-places";

// On demand only (the visitor taps "Show Google reviews"); never cached or stored (Google's terms).
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleRequest(request, ({ log }) => {
    const env = getEnv();
    return reviewsResponse({ apiKey: env.GOOGLE_PLACES_API_KEY, placeId: env.GOOGLE_PLACE_ID, log });
  });
}
