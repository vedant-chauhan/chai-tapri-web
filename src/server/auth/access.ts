/**
 * The admin access decision, kept pure so every branch is unit-tested. Used by the admin
 * layouts (pages) and `requireCapability` (staff API routes). No middleware (ADR-0010).
 */
import { MFA_REQUIRED_ROLES } from "./capabilities";
import type { StaffRole } from "@/server/db/schema";

export const SIGN_IN_PATH = "/admin/sign-in";
export const TWO_FACTOR_ENROL_PATH = "/admin/security/two-factor";

/** Better Auth's session cookie (`__Secure-` prefixed on https). Pinned by tests/integration/auth.test.ts. */
export const SESSION_COOKIE_PATTERN = /^(__Secure-)?better-auth\.session_token$/;

export interface StaffIdentity {
  userId: string;
  name: string;
  twoFactorEnabled: boolean;
  role: StaffRole | null;
}

export type AccessDecision =
  | { kind: "allow"; staff: StaffIdentity & { role: StaffRole } }
  | { kind: "redirect"; to: typeof SIGN_IN_PATH | typeof TWO_FACTOR_ENROL_PATH; reason: string }
  | { kind: "forbidden"; reason: string };

export interface AccessOptions {
  /** The enrolment page itself skips the MFA gate (otherwise nobody could enrol). */
  enforceMfa?: boolean;
}

export function decideAdminAccess(
  identity: StaffIdentity | null,
  { enforceMfa = true }: AccessOptions = {},
): AccessDecision {
  if (!identity) return { kind: "redirect", to: SIGN_IN_PATH, reason: "no_session" };
  if (!identity.role) return { kind: "forbidden", reason: "no_staff_role" };
  if (enforceMfa && MFA_REQUIRED_ROLES.has(identity.role) && !identity.twoFactorEnabled) {
    return { kind: "redirect", to: TWO_FACTOR_ENROL_PATH, reason: "mfa_enrolment_required" };
  }
  return { kind: "allow", staff: { ...identity, role: identity.role } };
}
