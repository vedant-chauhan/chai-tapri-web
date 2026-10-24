import { staffOrderingResponse } from "@/server/routes/store-status";
import { staffRoute } from "@/server/routes/staff";
import { clearOverride } from "@/server/store/ordering-controls";

export const dynamic = "force-dynamic";

/** Back to the schedule (owner; any role may clear its own "Close now"). */
export async function DELETE(request: Request) {
  return staffRoute(request, "ordering.close", async (ctx) => {
    await clearOverride(ctx);
    ctx.log.info("ordering override cleared", { actorRole: ctx.actor.role });
    return staffOrderingResponse(ctx.db, ctx.clock);
  });
}
