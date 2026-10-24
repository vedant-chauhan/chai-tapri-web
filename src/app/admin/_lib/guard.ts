import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { decideAdminAccess, SESSION_COOKIE_PATTERN, SIGN_IN_PATH, type AccessDecision } from "@/server/auth/access";
import { withAuth } from "@/server/auth/runtime";
import { loadStaffIdentity } from "@/server/auth/session";

/** Session + role for this request (deduplicated across layout and page). */
const accessFor = cache(async (enforceMfa: boolean): Promise<AccessDecision> => {
  // No session cookie → anonymous. Don't open a DB connection (keeps bots from waking Neon).
  const hasSessionCookie = (await cookies()).getAll().some((c) => SESSION_COOKIE_PATTERN.test(c.name));
  if (!hasSessionCookie) return { kind: "redirect", to: SIGN_IN_PATH, reason: "no_session" };

  const requestHeaders = await headers();
  return withAuth(async ({ auth }) => decideAdminAccess(await loadStaffIdentity(auth, requestHeaders), { enforceMfa }));
});

/**
 * Admin guard (PHASE-4-FOUNDATION §3: checked in layouts and every staff route handler, no middleware).
 * Redirects anonymous users and un-enrolled managers/owners; returns the decision otherwise.
 */
export async function requireAdmin({ enforceMfa = true } = {}) {
  const decision = await accessFor(enforceMfa);
  if (decision.kind === "redirect") redirect(decision.to);
  return decision;
}
