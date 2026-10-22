import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { decideAdminAccess, SESSION_COOKIE_PATTERN, SIGN_IN_PATH, TWO_FACTOR_ENROL_PATH } from "@/server/auth/access";
import { createAuth, type Auth } from "@/server/auth/auth";
import { createStaffUser, CreateStaffUserError } from "@/server/auth/create-staff-user";
import { requireCapability } from "@/server/auth/require-staff";
import { loadStaffIdentity } from "@/server/auth/session";
import { staffAccounts, staffRoles, staffUsers } from "@/server/db/schema";
import { createTestDb, type TestDb } from "../support/db";
import { secretFromOtpauthUri, totp } from "../support/totp";

const PASSWORD = "correct horse battery staple";
const ORIGIN = "http://localhost:3000";

let t: TestDb;
let auth: Auth;

/** A tiny cookie jar: Better Auth answers with Set-Cookie; the next call sends Cookie. */
class Jar {
  private cookies = new Map<string, string>();
  absorb(headers: Headers) {
    for (const line of headers.getSetCookie()) {
      const [pair, ...attrs] = line.split(";");
      const [name, ...rest] = pair.split("=");
      const expired = attrs.some((a) => /max-age=0/i.test(a.trim()));
      if (expired) this.cookies.delete(name.trim());
      else this.cookies.set(name.trim(), rest.join("="));
    }
  }
  names(): string[] {
    return [...this.cookies.keys()];
  }
  headers(): Headers {
    const h = new Headers({ origin: ORIGIN });
    if (this.cookies.size) h.set("cookie", [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; "));
    return h;
  }
}

async function signIn(email: string, password = PASSWORD) {
  const jar = new Jar();
  const { headers, response } = await auth.api.signInEmail({
    body: { email, password },
    headers: jar.headers(),
    returnHeaders: true,
  });
  jar.absorb(headers);
  return { jar, response: response as { twoFactorRedirect?: boolean; token?: string } };
}

async function decisionFor(jar: Jar, opts?: { enforceMfa?: boolean }) {
  return decideAdminAccess(await loadStaffIdentity(auth, t.db, jar.headers()), opts);
}

beforeAll(async () => {
  t = await createTestDb();
  auth = createAuth({ db: t.db, secret: "test-secret-".padEnd(48, "x"), baseURL: ORIGIN, rateLimit: false });
  await createStaffUser(auth, t.db, { email: "Owner@Example.com", name: "Owner", password: PASSWORD, role: "owner" });
  await createStaffUser(auth, t.db, { email: "staff@example.com", name: "Staff", password: PASSWORD, role: "staff" });
  await createStaffUser(auth, t.db, {
    email: "manager@example.com",
    name: "Manager",
    password: PASSWORD,
    role: "manager",
  });
});

afterAll(async () => {
  await t.dispose();
});

describe("createStaffUser (create-owner CLI core)", () => {
  it("stores a scrypt hash, never the password, and a UUID id", async () => {
    const [user] = await t.db.select().from(staffUsers).where(eq(staffUsers.email, "owner@example.com"));
    expect(user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    const [account] = await t.db.select().from(staffAccounts).where(eq(staffAccounts.userId, user.id));
    expect(account.providerId).toBe("credential");
    expect(account.password).not.toContain(PASSWORD);
    const [role] = await t.db.select().from(staffRoles).where(eq(staffRoles.userId, user.id));
    expect(role.role).toBe("owner");
  });

  it("refuses short passwords and duplicate emails", async () => {
    await expect(
      createStaffUser(auth, t.db, { email: "x@example.com", name: "X", password: "short", role: "staff" }),
    ).rejects.toMatchObject({ code: "weak_password" });
    await expect(
      createStaffUser(auth, t.db, { email: "owner@example.com", name: "Dup", password: PASSWORD, role: "staff" }),
    ).rejects.toBeInstanceOf(CreateStaffUserError);
  });
});

describe("sign-in", () => {
  it("public sign-up is disabled", async () => {
    await expect(
      auth.api.signUpEmail({ body: { email: "new@example.com", password: PASSWORD, name: "New" } }),
    ).rejects.toThrow();
  });

  it("rejects a wrong password", async () => {
    await expect(signIn("staff@example.com", "wrong password here")).rejects.toThrow();
  });
});

describe("admin guard (F4-5 acceptance)", () => {
  it("anonymous → redirect to sign-in", async () => {
    expect(await decisionFor(new Jar())).toMatchObject({ kind: "redirect", to: SIGN_IN_PATH });
  });

  it("staff without TOTP → allowed (TOTP optional for staff)", async () => {
    const { jar } = await signIn("staff@example.com");
    // The layout guard skips the DB when this cookie is absent, so its name must match.
    expect(jar.names().some((n) => SESSION_COOKIE_PATTERN.test(n))).toBe(true);
    expect(await decisionFor(jar)).toMatchObject({ kind: "allow", staff: { role: "staff" } });
  });

  it("owner without TOTP → forced enrolment", async () => {
    const { jar } = await signIn("owner@example.com");
    expect(await decisionFor(jar)).toMatchObject({ kind: "redirect", to: TWO_FACTOR_ENROL_PATH });
    // ...but the enrolment page itself is reachable.
    expect(await decisionFor(jar, { enforceMfa: false })).toMatchObject({ kind: "allow" });
  });

  it("manager without TOTP → forced enrolment", async () => {
    const { jar } = await signIn("manager@example.com");
    expect(await decisionFor(jar)).toMatchObject({ kind: "redirect", to: TWO_FACTOR_ENROL_PATH });
  });

  it("signed-in user without a staff role → forbidden", async () => {
    const [owner] = await t.db.select().from(staffUsers).where(eq(staffUsers.email, "staff@example.com"));
    const { jar } = await signIn("staff@example.com");
    await t.db.delete(staffRoles).where(eq(staffRoles.userId, owner.id));
    expect(await decisionFor(jar)).toMatchObject({ kind: "forbidden" });
    await t.db.insert(staffRoles).values({ userId: owner.id, role: "staff" });
  });
});

describe("TOTP enrolment and second-factor sign-in", () => {
  it("owner enrols, then must pass TOTP on the next sign-in", async () => {
    // Enrol: password re-check → secret → verify a code from the app.
    const first = await signIn("owner@example.com");
    const enabled = await auth.api.enableTwoFactor({
      body: { password: PASSWORD, method: "totp" },
      headers: first.jar.headers(),
    });
    if (enabled.method !== "totp") throw new Error("expected TOTP");
    const { totpURI, backupCodes } = enabled;
    expect(backupCodes.length).toBeGreaterThan(0);
    const secret = secretFromOtpauthUri(totpURI);
    expect(totpURI).toContain("issuer=Chai");

    const verified = await auth.api.verifyTOTP({
      body: { code: totp(secret) },
      headers: first.jar.headers(),
      returnHeaders: true,
    });
    first.jar.absorb(verified.headers);
    expect(await decisionFor(first.jar)).toMatchObject({
      kind: "allow",
      staff: { role: "owner", twoFactorEnabled: true },
    });

    // Next sign-in: password alone gives no session.
    const second = await signIn("owner@example.com");
    expect(second.response.twoFactorRedirect).toBe(true);
    expect(await decisionFor(second.jar)).toMatchObject({ kind: "redirect", to: SIGN_IN_PATH });

    // A wrong code is rejected; the right one creates the session.
    await expect(auth.api.verifyTOTP({ body: { code: "000000" }, headers: second.jar.headers() })).rejects.toThrow();
    const ok = await auth.api.verifyTOTP({
      body: { code: totp(secret) },
      headers: second.jar.headers(),
      returnHeaders: true,
    });
    second.jar.absorb(ok.headers);
    expect(await decisionFor(second.jar)).toMatchObject({ kind: "allow", staff: { role: "owner" } });
  });
});

describe("requireCapability (staff route handlers)", () => {
  it("401 anonymous, 403 missing capability, OK when allowed", async () => {
    await expect(requireCapability(auth, t.db, new Jar().headers(), "board.view")).rejects.toMatchObject({
      code: "unauthenticated",
    });
    const { jar } = await signIn("staff@example.com");
    await expect(requireCapability(auth, t.db, jar.headers(), "board.view")).resolves.toMatchObject({ role: "staff" });
    await expect(requireCapability(auth, t.db, jar.headers(), "ordering.open")).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("403 for a manager who hasn't enrolled TOTP, even for staff-level actions", async () => {
    const { jar } = await signIn("manager@example.com");
    await expect(requireCapability(auth, t.db, jar.headers(), "board.view")).rejects.toMatchObject({
      code: "forbidden",
    });
  });
});
