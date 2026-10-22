/**
 * Better Auth configuration for staff sign-in (ADR-0010, SLICE-01 §"Sign-in", SECURITY.md).
 *
 * - Email + password, sign-up disabled: accounts are created by an owner (or the
 *   `create-owner` CLI for the first one). No default passwords.
 * - TOTP via the twoFactor plugin. Mandatory for manager/owner (enforced by the admin guard),
 *   optional for staff [Assumption, SLICE-01].
 * - 12 h sessions with no sliding refresh, so a shift's session ends on time.
 * - Rate limits stored in Postgres (Worker isolates don't share memory): sign-in 5/min.
 *
 * A new instance per request: on Workers the DB connection can't outlive the request.
 */
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";
import { betterAuthSchema } from "@/server/db/schema";
import type { Db } from "@/server/db/types";

export const SESSION_TTL_SECONDS = 12 * 60 * 60;
export const MIN_PASSWORD_LENGTH = 12;
export const TOTP_ISSUER = "Chai Tapri";

export interface AuthConfig {
  db: Db;
  secret: string;
  /** Public origin, e.g. https://chai-tapri-staging.example.workers.dev */
  baseURL: string;
  /** Off only in tests. */
  rateLimit?: boolean;
}

export function createAuth({ db, secret, baseURL, rateLimit = true }: AuthConfig) {
  return betterAuth({
    appName: TOTP_ISSUER,
    baseURL,
    basePath: "/api/auth",
    secret,
    trustedOrigins: [new URL(baseURL).origin],
    database: drizzleAdapter(db, { provider: "pg", schema: betterAuthSchema }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      autoSignIn: false,
      minPasswordLength: MIN_PASSWORD_LENGTH,
      maxPasswordLength: 128,
    },
    user: {
      changeEmail: { enabled: false },
      deleteUser: { enabled: false },
    },
    session: {
      expiresIn: SESSION_TTL_SECONDS,
      disableSessionRefresh: true,
      // Refunds and role changes re-check that sign-in happened within this window (slice 1).
      freshAge: 15 * 60,
    },
    rateLimit: {
      enabled: rateLimit,
      storage: "database",
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/two-factor/verify-totp": { window: 60, max: 5 },
        "/two-factor/verify-backup-code": { window: 60, max: 5 },
      },
    },
    advanced: {
      // UUIDs generated in the app, so they fit uuid columns like store_settings.updated_by.
      database: { generateId: () => crypto.randomUUID() },
      useSecureCookies: baseURL.startsWith("https://"),
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"] },
    },
    telemetry: { enabled: false },
    // nextCookies must stay last: it lets Server Actions set the session cookie.
    plugins: [twoFactor({ issuer: TOTP_ISSUER }), nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;
