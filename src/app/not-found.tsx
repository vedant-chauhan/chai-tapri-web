import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 px-4 py-24 sm:px-6">
      <h1 className="font-display text-xl font-extrabold tracking-tight">This page doesn&apos;t exist</h1>
      <p>It may have moved. Try the menu or the home page.</p>
      <p className="flex gap-6">
        <Link href="/menu" className="inline-flex min-h-11 items-center font-semibold underline">
          Menu
        </Link>
        <Link href="/" className="inline-flex min-h-11 items-center font-semibold underline">
          Home
        </Link>
      </p>
    </main>
  );
}
