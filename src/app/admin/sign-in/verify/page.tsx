import { VerifyForm } from "./verify-form";

export default function VerifyPage() {
  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">Two-step sign-in</h1>
      <p>Open your authenticator app and enter the 6-digit code for Chai Tapri.</p>
      <VerifyForm />
    </main>
  );
}
