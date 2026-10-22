"use client";

import { useActionState, useState } from "react";
import { verifyTotpAction, type FormState } from "../../actions";
import { Field, FormError, SubmitButton } from "@/ui/form";

export function VerifyForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(verifyTotpAction, {});
  const [useBackup, setUseBackup] = useState(false);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormError message={state.error} />
      <input type="hidden" name="method" value={useBackup ? "backup" : "totp"} />
      {useBackup ? (
        <Field id="code" label="Backup code" autoComplete="off" required />
      ) : (
        <Field
          id="code"
          label="6-digit code"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          autoComplete="one-time-code"
          required
        />
      )}
      <SubmitButton pending={pending}>Verify</SubmitButton>
      <button type="button" className="self-start underline" onClick={() => setUseBackup((v) => !v)}>
        {useBackup ? "Use my authenticator app instead" : "Use a backup code instead"}
      </button>
    </form>
  );
}
