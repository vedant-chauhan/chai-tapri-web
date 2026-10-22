import { describe, expect, it } from "vitest";
import { decideAdminAccess, SIGN_IN_PATH, TWO_FACTOR_ENROL_PATH, type StaffIdentity } from "@/server/auth/access";
import { can, CAPABILITIES, type Capability } from "@/server/auth/capabilities";

const who = (role: StaffIdentity["role"], twoFactorEnabled = false): StaffIdentity => ({
  userId: "u1",
  name: "Test",
  role,
  twoFactorEnabled,
});

describe("decideAdminAccess", () => {
  it.each([
    ["anonymous", null, { kind: "redirect", to: SIGN_IN_PATH }],
    ["no staff role", who(null), { kind: "forbidden" }],
    ["staff, no TOTP", who("staff"), { kind: "allow" }],
    ["staff, TOTP", who("staff", true), { kind: "allow" }],
    ["manager, no TOTP", who("manager"), { kind: "redirect", to: TWO_FACTOR_ENROL_PATH }],
    ["manager, TOTP", who("manager", true), { kind: "allow" }],
    ["owner, no TOTP", who("owner"), { kind: "redirect", to: TWO_FACTOR_ENROL_PATH }],
    ["owner, TOTP", who("owner", true), { kind: "allow" }],
  ] as const)("%s", (_label, identity, expected) => {
    expect(decideAdminAccess(identity)).toMatchObject(expected);
  });

  it("the enrolment page lets an un-enrolled owner in, but never an anonymous user", () => {
    expect(decideAdminAccess(who("owner"), { enforceMfa: false })).toMatchObject({ kind: "allow" });
    expect(decideAdminAccess(null, { enforceMfa: false })).toMatchObject({ kind: "redirect", to: SIGN_IN_PATH });
  });
});

describe("capabilities (deny by default)", () => {
  const ownerOnly: Capability[] = ["ordering.open", "hours.edit", "staff.manage", "integrations.manage"];
  const managerUp: Capability[] = ["orders.cancel", "orders.refund"];

  it("nobody without a role can do anything", () => {
    for (const c of CAPABILITIES) expect(can(null, c)).toBe(false);
  });

  it("owner can do everything", () => {
    for (const c of CAPABILITIES) expect(can("owner", c)).toBe(true);
  });

  it("owner-only actions are owner-only", () => {
    for (const c of ownerOnly) {
      expect(can("staff", c)).toBe(false);
      expect(can("manager", c)).toBe(false);
    }
  });

  it("refunds and staff cancels need manager+", () => {
    for (const c of managerUp) {
      expect(can("staff", c)).toBe(false);
      expect(can("manager", c)).toBe(true);
    }
  });

  it("staff run the board", () => {
    for (const c of ["board.view", "orders.accept", "orders.decline", "orders.ready", "ordering.close"] as const) {
      expect(can("staff", c)).toBe(true);
    }
  });
});
