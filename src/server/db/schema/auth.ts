/**
 * Staff authentication tables (DATABASE.md §6: "users, sessions and 2FA tables come from the
 * auth library (Better Auth), plus staff_roles"). Field sets match Better Auth 1.7 with the
 * twoFactor plugin and database rate limiting; table/column names follow the §6 conventions
 * (plural snake_case). The JS keys are what Better Auth's Drizzle adapter looks up.
 *
 * Ids are UUID strings (Better Auth `generateId: "uuid"`), so they fit the uuid `actor_id` /
 * `updated_by` columns elsewhere.
 */
import { sql } from "drizzle-orm";
import { bigint, boolean, check, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { timestamps } from "./app";

const tz = (name: string) => timestamp(name, { withTimezone: true });

export const staffUsers = pgTable("staff_users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  ...timestamps,
});

export const staffSessions = pgTable(
  "staff_sessions",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    expiresAt: tz("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => staffUsers.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (t) => [index("staff_sessions_user_id").on(t.userId)],
);

/** Credentials. `password` holds Better Auth's scrypt hash, never a plain password. */
export const staffAccounts = pgTable(
  "staff_accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => staffUsers.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: tz("access_token_expires_at"),
    refreshTokenExpiresAt: tz("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    ...timestamps,
  },
  (t) => [index("staff_accounts_user_id").on(t.userId)],
);

export const staffVerifications = pgTable(
  "staff_verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: tz("expires_at").notNull(),
    ...timestamps,
  },
  (t) => [index("staff_verifications_identifier").on(t.identifier)],
);

/** TOTP secret (encrypted by Better Auth) and hashed backup codes. */
export const staffTwoFactors = pgTable(
  "staff_two_factors",
  {
    id: text("id").primaryKey(),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => staffUsers.id, { onDelete: "cascade" }),
    verified: boolean("verified").default(true),
    failedVerificationCount: integer("failed_verification_count").default(0),
    lockedUntil: tz("locked_until"),
    ...timestamps,
  },
  (t) => [index("staff_two_factors_user_id").on(t.userId)],
);

/** Better Auth rate-limit counters, in Postgres so limits hold across Worker isolates (ADR-0010). */
export const authRateLimits = pgTable("auth_rate_limits", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});

export const STAFF_ROLES = ["staff", "manager", "owner"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

/** One role per staff user. Capabilities per role live in code (src/server/auth/capabilities.ts). */
export const staffRoles = pgTable(
  "staff_roles",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => staffUsers.id, { onDelete: "cascade" }),
    role: text("role", { enum: STAFF_ROLES }).notNull(),
    ...timestamps,
  },
  (t) => [check("staff_roles_role_valid", sql`${t.role} in ('staff', 'manager', 'owner')`)],
);

/** Keyed by Better Auth model name, for `drizzleAdapter(db, { schema })`. */
export const betterAuthSchema = {
  user: staffUsers,
  session: staffSessions,
  account: staffAccounts,
  verification: staffVerifications,
  twoFactor: staffTwoFactors,
  rateLimit: authRateLimits,
};
