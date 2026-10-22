import { requireAdmin } from "../../../_lib/guard";
import { EnrolForm } from "./enrol-form";

export default async function TwoFactorEnrolPage() {
  // Signed-in staff only; the MFA gate is skipped here so managers/owners can enrol.
  const decision = await requireAdmin({ enforceMfa: false });
  if (decision.kind === "forbidden") return <p role="alert">This account doesn&apos;t have staff access.</p>;
  const { staff } = decision;

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">Set up two-step sign-in</h1>
      {staff.twoFactorEnabled ? (
        <p>Two-step sign-in is already on for your account.</p>
      ) : (
        <>
          <p>
            {staff.role === "staff"
              ? "Recommended: protect your account with an authenticator app."
              : "Managers and owners must use an authenticator app (for example Google Authenticator, Microsoft Authenticator or 1Password) before using the staff area."}
          </p>
          <EnrolForm />
        </>
      )}
    </main>
  );
}
