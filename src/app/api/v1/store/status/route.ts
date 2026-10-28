import { systemClock } from "@/domain/clock";
import { handleRequest } from "@/server/http";
import { statusResponseFromInput } from "@/server/routes/store-status";
import { withScheduleInput } from "@/server/store/schedule-source";

// Live status for the header chip, menu and checkout (BR-AV-12). Computed per request; cached 10 s.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleRequest(request, () =>
    withScheduleInput(systemClock.now(), async (input, source) => statusResponseFromInput(input, source)),
  );
}
