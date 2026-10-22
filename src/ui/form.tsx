// Minimal accessible form primitives for the staff screens. Real component library arrives in slice 1.
import type { InputHTMLAttributes, ReactNode } from "react";

export function Field({
  id,
  label,
  hint,
  ...input
}: { id: string; label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-semibold">
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="text-sm">
          {hint}
        </p>
      ) : null}
      <input
        id={id}
        name={id}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="border-ink/40 min-h-11 rounded border-2 bg-white px-3 text-base"
        {...input}
      />
    </div>
  );
}

export function SubmitButton({ children, pending }: { children: ReactNode; pending?: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-accent text-accent-ink min-h-11 rounded px-5 font-semibold disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="bg-surface text-danger rounded px-3 py-2 font-semibold">
      {message}
    </p>
  );
}
