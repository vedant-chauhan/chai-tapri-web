import { readJson } from "@/server/routes/body";
import { staffOrderingResponse } from "@/server/routes/store-status";
import { staffRoute } from "@/server/routes/staff";
import { openBodySchema, openOrdering } from "@/server/store/ordering-controls";

export const dynamic = "force-dynamic";

/** "Open now until …" (owner; end time required). */
export async function POST(request: Request) {
  return staffRoute(request, "ordering.open", async (ctx) => {
    await openOrdering(ctx, await readJson(request, openBodySchema));
    ctx.log.info("ordering opened", { actorRole: ctx.actor.role });
    return staffOrderingResponse(ctx.db, ctx.clock);
  });
}
