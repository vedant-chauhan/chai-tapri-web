"use client";

import { useActionState } from "react";
import { finishEnrolmentAction, startEnrolmentAction, type EnrolState, type FormState } from "../../../actions";
import { Field, FormError, SubmitButton } from "@/ui/form";

/** Groups a base32 key in fours so it's easier to type into an app. */
const group = (key: string) => key.match(/.{1,4}/g)?.join(" ") ?? key;

export function EnrolForm() {
  const [setup, start, starting] = useActionState<EnrolState, FormData>(startEnrolmentAction, {});
  const [finish, verify, verifying] = useActionState<FormState, FormData>(finishEnrolmentAction, {});

  if (!setup.totpUri) {
    return (
      <form action={start} className="flex flex-col gap-4" noValidate>
        <FormError message={setup.error} />
        <Field
          id="password"
          label="Your password"
          hint="We ask again before changing sign-in settings."
          type="password"
          autoComplete="current-password"
          required
        />
        <SubmitButton pending={starting}>Continue</SubmitButton>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="step-1" className="bg-surface flex flex-col gap-2 rounded p-4">
        <h2 id="step-1" className="font-bold">
          1. Add Chai Tapri to your authenticator app
        </h2>
        <p>
          On this phone, <a href={setup.totpUri}>open it in your authenticator app</a>. On another device, choose
          &ldquo;enter a setup key&rdquo; and type:
        </p>
        <p className="text-lg font-semibold tracking-wider break-all" aria-label="Setup key">
          {group(setup.setupKey ?? "")}
        </p>
      </section>

      <section aria-labelledby="step-2" className="bg-surface flex flex-col gap-2 rounded p-4">
        <h2 id="step-2" className="font-bold">
          2. Save your backup codes
        </h2>
        <p>Each code works once if you lose your phone. Store them somewhere safe; they won&apos;t be shown again.</p>
        <ul className="grid grid-cols-2 gap-1 font-semibold">
          {setup.backupCodes?.map((code) => (
            <li key={code}>{code}</li>
          ))}
        </ul>
      </section>

      <form action={verify} className="flex flex-col gap-4" noValidate aria-labelledby="step-3">
        <h2 id="step-3" className="font-bold">
          3. Enter the code from the app
        </h2>
        <FormError message={finish.error} />
        <Field
          id="code"
          label="6-digit code"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          autoComplete="one-time-code"
          required
        />
        <SubmitButton pending={verifying}>Turn on two-step sign-in</SubmitButton>
      </form>
    </div>
  );
}
