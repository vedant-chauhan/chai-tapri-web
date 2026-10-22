import { signOutAction } from "../actions";
import { requireAdmin } from "../_lib/guard";

/** Everything under here needs a staff session, a role and (for manager/owner) TOTP. */
export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const decision = await requireAdmin();
  if (decision.kind === "forbidden") {
    return (
      <main className="flex flex-col gap-4">
        <h1 className="text-xl font-bold">No staff access</h1>
        <p>This account isn&apos;t set up for the staff area. Ask the owner to add you.</p>
        <form action={signOutAction}>
          <button type="submit" className="underline">
            Sign out
          </button>
        </form>
      </main>
    );
  }

  return (
    <>
      <header className="mb-8 flex items-center justify-between gap-4">
        <p>
          {decision.staff.name} <span className="text-sm">({decision.staff.role})</span>
        </p>
        <form action={signOutAction}>
          <button type="submit" className="min-h-11 underline">
            Sign out
          </button>
        </form>
      </header>
      {children}
    </>
  );
}
