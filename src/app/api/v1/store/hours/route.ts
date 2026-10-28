import { systemClock } from "@/domain/clock";
import { handleRequest } from "@/server/http";
import { hoursResponseFromInput } from "@/server/routes/store-status";
import { withScheduleInput } from "@/server/store/schedule-source";

// Weekly hours + closures in the next 14 days, for the Visit page and footer.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleRequest(request, () =>
    withScheduleInput(systemClock.now(), async (input, source) => hoursResponseFromInput(input, source)),
  );
}
