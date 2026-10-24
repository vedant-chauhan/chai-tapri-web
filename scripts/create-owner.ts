/**
 * Creates the first owner account (F4-5). No default passwords:
 * the password is typed at a hidden prompt (or piped on stdin), never passed as an argument,
 * so it doesn't end up in shell history. The owner must enrol TOTP at first sign-in.
 *
 *   DATABASE_URL=… AUTH_SECRET=… pnpm auth:create-owner --email owner@example.com --name "Owner Name"
 */
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { createAuth, MIN_PASSWORD_LENGTH } from "../src/server/auth/auth";
import { createStaffUser, CreateStaffUserError } from "../src/server/auth/create-staff-user";
import { connectNode } from "../src/server/db/node";

function usage(message?: string): never {
  if (message) console.error(message);
  console.error('Usage: pnpm auth:create-owner --email <email> --name "<full name>"');
  process.exit(1);
}

/** Reads one line without echoing it (TTY), or the first line of piped stdin. */
function readPassword(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: process.stdin.isTTY });
    if (process.stdin.isTTY) {
      process.stdout.write(prompt);
      // Mute echo: swallow everything readline would print while typing.
      (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = () => {};
    }
    rl.question("", (answer) => {
      rl.close();
      if (process.stdin.isTTY) process.stdout.write("\n");
      resolve(answer);
    });
  });
}

async function main() {
  const { values } = parseArgs({
    options: { email: { type: "string" }, name: { type: "string" } },
    strict: true,
  });
  if (!values.email || !values.name) usage();

  const url = process.env.DATABASE_URL;
  const secret = process.env.AUTH_SECRET;
  if (!url) usage("DATABASE_URL is not set.");
  if (!secret || secret.length < 32) usage("AUTH_SECRET is not set (32+ characters).");

  const password = await readPassword(`Password for ${values.email} (min ${MIN_PASSWORD_LENGTH} characters): `);
  if (process.stdin.isTTY) {
    const confirm = await readPassword("Repeat password: ");
    if (confirm !== password) usage("Passwords don't match.");
  }

  const conn = await connectNode(url);
  try {
    const auth = createAuth({
      db: conn.db,
      secret,
      baseURL: process.env.AUTH_URL ?? "http://localhost:3000",
      rateLimit: false,
    });
    const { userId } = await createStaffUser(auth, {
      email: values.email,
      name: values.name,
      password,
      role: "owner",
    });
    console.log(`Owner account created (id ${userId}). Sign in at /admin/sign-in and set up two-step sign-in.`);
  } catch (err) {
    if (err instanceof CreateStaffUserError) usage(err.message);
    throw err;
  } finally {
    await conn.close();
  }
}

main().catch((err: unknown) => {
  console.error("create-owner failed:", err instanceof Error ? err.message : "unknown error");
  process.exit(1);
});
