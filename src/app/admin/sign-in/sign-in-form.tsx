"use client";

import { useActionState } from "react";
import { signInAction, type FormState } from "../actions";
import { Field, FormError, SubmitButton } from "@/ui/form";

export function SignInForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signInAction, {});
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormError message={state.error} />
      <Field id="email" label="Email" type="email" autoComplete="username" required />
      <Field id="password" label="Password" type="password" autoComplete="current-password" required />
      <SubmitButton pending={pending}>Sign in</SubmitButton>
    </form>
  );
}
