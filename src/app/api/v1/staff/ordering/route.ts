import { staffOrderingResponse } from "@/server/routes/store-status";
import { staffRoute } from "@/server/routes/staff";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return staffRoute(request, "board.view", ({ db, clock }) => staffOrderingResponse(db, clock));
}
