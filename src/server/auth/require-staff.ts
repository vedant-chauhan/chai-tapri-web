/**
 * Guard for staff route handlers (API.md: "session cookie + role check on every call").
 * Throws ApiError, which handleRequest turns into the API error shape.
 */
import { decideAdminAccess } from "./access";
import type { Auth } from "./auth";
import { can, type Capability } from "./capabilities";
import { loadStaffIdentity } from "./session";
import { ApiError } from "@/lib/errors";

export async function requireCapability(auth: Auth, headers: Headers, capability: Capability) {
  const decision = decideAdminAccess(await loadStaffIdentity(auth, headers));
  if (decision.kind === "redirect" && decision.reason === "no_session") throw new ApiError("unauthenticated");
  if (decision.kind === "redirect") {
    throw new ApiError("forbidden", { message: "Set up two-step sign-in before using the order screen." });
  }
  if (decision.kind === "forbidden") throw new ApiError("forbidden");
  if (!can(decision.staff.role, capability)) throw new ApiError("forbidden");
  return decision.staff;
}
