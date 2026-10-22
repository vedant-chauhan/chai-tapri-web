"use server";

/**
 * Staff sign-in, second factor, TOTP enrolment and sign-out (SLICE-01 "Sign-in").
 * Error messages stay generic (no "unknown email" vs "wrong password" distinction).
 * Better Auth sets/clears cookies through the nextCookies plugin.
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logger } from "@/lib/logger";
import { SIGN_IN_PATH } from "@/server/auth/access";
import { withAuth } from "@/server/auth/runtime";

export interface FormState {
  error?: string | null;
}

export interface EnrolState extends FormState {
  totpUri?: string;
  setupKey?: string;
  backupCodes?: string[];
}

const ADMIN_HOME = "/admin";
const VERIFY_PATH = "/admin/sign-in/verify";

function statusOf(err: unknown): number | undefined {
  return typeof err === "object" && err !== null && "statusCode" in err
    ? Number((err as { statusCode: unknown }).statusCode)
    : undefined;
}

function friendly(err: unknown, fallback: string): string {
  if (statusOf(err) === 429) return "Too many attempts. Wait a minute and try again.";
  return fallback;
}

const signInSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(128),
});

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: "Enter your email and password." };

  let next: string;
  try {
    const requestHeaders = await headers();
    const result = await withAuth(({ auth }) => auth.api.signInEmail({ body: parsed.data, headers: requestHeaders }));
    next = "twoFactorRedirect" in result && result.twoFactorRedirect ? VERIFY_PATH : ADMIN_HOME;
  } catch (err) {
    logger.warn("staff sign-in failed", { status: statusOf(err) });
    return { error: friendly(err, "Email or password is incorrect.") };
  }
  redirect(next);
}

const codeSchema = z
  .string()
  .trim()
  .regex(/^\d{6}$/, "Enter the 6-digit code.");
const backupCodeSchema = z.string().trim().min(6).max(32);

export async function verifyTotpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const useBackup = formData.get("method") === "backup";
  const parsed = (useBackup ? backupCodeSchema : codeSchema).safeParse(formData.get("code"));
  if (!parsed.success) return { error: useBackup ? "Enter a backup code." : "Enter the 6-digit code." };

  try {
    const requestHeaders = await headers();
    await withAuth(({ auth }) =>
      useBackup
        ? auth.api.verifyBackupCode({ body: { code: parsed.data }, headers: requestHeaders })
        : auth.api.verifyTOTP({ body: { code: parsed.data }, headers: requestHeaders }),
    );
  } catch (err) {
    logger.warn("staff second factor failed", { status: statusOf(err), method: useBackup ? "backup" : "totp" });
    return {
      error: friendly(err, "That code didn't work. Check your phone's clock, or sign in again if this took a while."),
    };
  }
  redirect(ADMIN_HOME);
}

const passwordSchema = z.string().min(1).max(128);

export async function startEnrolmentAction(_prev: EnrolState, formData: FormData): Promise<EnrolState> {
  const parsed = passwordSchema.safeParse(formData.get("password"));
  if (!parsed.success) return { error: "Enter your password to continue." };

  try {
    const requestHeaders = await headers();
    const result = await withAuth(({ auth }) =>
      auth.api.enableTwoFactor({ body: { password: parsed.data, method: "totp" }, headers: requestHeaders }),
    );
    if (result.method !== "totp") throw new Error("unexpected two-factor method");
    const setupKey = new URL(result.totpURI).searchParams.get("secret") ?? "";
    return { totpUri: result.totpURI, setupKey, backupCodes: result.backupCodes };
  } catch (err) {
    logger.warn("two-factor enrolment start failed", { status: statusOf(err) });
    return { error: friendly(err, "Password is incorrect.") };
  }
}

export async function finishEnrolmentAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = codeSchema.safeParse(formData.get("code"));
  if (!parsed.success) return { error: "Enter the 6-digit code from your authenticator app." };

  try {
    const requestHeaders = await headers();
    await withAuth(({ auth }) => auth.api.verifyTOTP({ body: { code: parsed.data }, headers: requestHeaders }));
  } catch (err) {
    logger.warn("two-factor enrolment verify failed", { status: statusOf(err) });
    return { error: friendly(err, "That code didn't work. Check your phone's clock and try the newest code.") };
  }
  redirect(ADMIN_HOME);
}

export async function signOutAction(): Promise<void> {
  const requestHeaders = await headers();
  await withAuth(({ auth }) => auth.api.signOut({ headers: requestHeaders })).catch(() => {});
  redirect(SIGN_IN_PATH);
}
