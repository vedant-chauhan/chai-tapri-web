/**
 * Creates a staff user with a password credential and a role. Used by the `create-owner` CLI
 * (first owner) and, in slice 1, the owner's staff screen. There are no default passwords: the
 * caller supplies one, and manager/owner must enrol TOTP on first sign-in (admin guard).
 */
import type { Auth } from "./auth";
import { MIN_PASSWORD_LENGTH } from "./auth";
import type { StaffRole } from "@/server/db/schema";

export class CreateStaffUserError extends Error {
  constructor(
    readonly code: "email_taken" | "weak_password" | "invalid_input",
    message: string,
  ) {
    super(message);
    this.name = "CreateStaffUserError";
  }
}

export interface NewStaffUser {
  email: string;
  name: string;
  password: string;
  role: StaffRole;
}

export async function createStaffUser(auth: Auth, input: NewStaffUser): Promise<{ userId: string }> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new CreateStaffUserError("invalid_input", "Invalid email address.");
  if (!name) throw new CreateStaffUserError("invalid_input", "Name is required.");
  if (input.password.length < MIN_PASSWORD_LENGTH) {
    throw new CreateStaffUserError("weak_password", `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  const ctx = await auth.$context;
  if (await ctx.internalAdapter.findUserByEmail(email)) {
    throw new CreateStaffUserError("email_taken", "A staff account with this email already exists.");
  }

  const user = await ctx.internalAdapter.createUser(
    { email, name, emailVerified: true, role: input.role },
    { method: "admin" },
  );
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: await ctx.password.hash(input.password),
  });
  return { userId: user.id };
}
