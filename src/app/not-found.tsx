import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-xl flex-col items-center gap-4 px-6 py-28 text-center">
      <p className="font-mono text-sm text-lime">404</p>
      <h1 className="font-display text-3xl font-bold tracking-tight">We couldn&apos;t find that page</h1>
      <p className="text-muted">
        The link may be wrong, or the problem isn&apos;t published yet.
      </p>
      <Link href="/patterns" className="mt-2 min-h-11 rounded-xl bg-lime px-5 py-2.5 font-semibold text-bg">
        Browse patterns
      </Link>
    </main>
  );
}
