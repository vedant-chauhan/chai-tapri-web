import { getEnv } from "@/lib/env";
import { handleRequest } from "@/server/http";
import { reviewsStatusResponse } from "@/server/reviews/google-places";

// Is the Google key configured? No call to Google, so it's free to ask on every page view.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleRequest(request, async () => {
    const env = getEnv();
    return reviewsStatusResponse({ apiKey: env.GOOGLE_PLACES_API_KEY, placeId: env.GOOGLE_PLACE_ID });
  });
}
