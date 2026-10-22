import { SignInForm } from "./sign-in-form";

export default function SignInPage() {
  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-xl font-bold">Staff sign-in</h1>
      <SignInForm />
    </main>
  );
}
