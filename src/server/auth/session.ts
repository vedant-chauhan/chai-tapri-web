import type { Auth } from "./auth";
import type { StaffIdentity } from "./access";
import { STAFF_ROLES, type StaffRole } from "@/server/db/schema";

const isStaffRole = (value: unknown): value is StaffRole => STAFF_ROLES.includes(value as StaffRole);

/** Session (from the cookie in `headers`) with the staff role. Null when not signed in. */
export async function loadStaffIdentity(auth: Auth, headers: Headers): Promise<StaffIdentity | null> {
  const session = await auth.api.getSession({ headers });
  if (!session) return null;
  const role = (session.user as { role?: unknown }).role;
  return {
    userId: session.user.id,
    name: session.user.name,
    twoFactorEnabled: session.user.twoFactorEnabled === true,
    role: isStaffRole(role) ? role : null,
  };
}
