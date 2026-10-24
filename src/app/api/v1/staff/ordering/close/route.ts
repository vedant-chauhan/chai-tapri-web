import { readJson } from "@/server/routes/body";
import { staffOrderingResponse } from "@/server/routes/store-status";
import { staffRoute } from "@/server/routes/staff";
import { closeBodySchema, closeOrdering } from "@/server/store/ordering-controls";

export const dynamic = "force-dynamic";

/** "Close now" (staff+; staff limited to 2 h). */
export async function POST(request: Request) {
  return staffRoute(request, "ordering.close", async (ctx) => {
    await closeOrdering(ctx, await readJson(request, closeBodySchema));
    ctx.log.info("ordering closed", { actorRole: ctx.actor.role });
    return staffOrderingResponse(ctx.db, ctx.clock);
  });
}
