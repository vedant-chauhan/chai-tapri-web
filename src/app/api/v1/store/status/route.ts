import { systemClock } from "@/domain/clock";
import { requireEnv } from "@/lib/env";
import { withDb } from "@/server/db/client";
import { handleRequest } from "@/server/http";
import { storeStatusResponse } from "@/server/routes/store-status";

// Live status for the header chip, menu and checkout (BR-AV-12). Computed per request; cached 10 s.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleRequest(request, () => withDb(requireEnv("DATABASE_URL"), (db) => storeStatusResponse(db, systemClock)));
}
