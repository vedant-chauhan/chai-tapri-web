import { eq } from "drizzle-orm";
import type { Auth } from "./auth";
import type { StaffIdentity } from "./access";
import { staffRoles } from "@/server/db/schema";
import type { Db } from "@/server/db/types";

/** Session (from the cookie in `headers`) + role. Null when not signed in. */
export async function loadStaffIdentity(auth: Auth, db: Db, headers: Headers): Promise<StaffIdentity | null> {
  const session = await auth.api.getSession({ headers });
  if (!session) return null;
  const [row] = await db
    .select({ role: staffRoles.role })
    .from(staffRoles)
    .where(eq(staffRoles.userId, session.user.id));
  return {
    userId: session.user.id,
    name: session.user.name,
    twoFactorEnabled: session.user.twoFactorEnabled === true,
    role: row?.role ?? null,
  };
}
