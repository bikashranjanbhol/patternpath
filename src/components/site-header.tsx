import Link from "next/link";
import { Suspense } from "react";
import { getViewer, viewerHasActiveClaim } from "@/lib/session";
import { Logo } from "./ui";
import { SignOutButton } from "./sign-out-button";

export function SiteHeader() {
  return (
    <header className="border-b border-[#1c212c] bg-bg-2">
      <nav aria-label="Main" className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo />
          <span className="font-display text-xl font-bold tracking-tight">PatternPath</span>
        </Link>
        <div className="flex flex-wrap items-center gap-6 text-[15px] text-muted">
          <Link href="/patterns" className="hover:text-ink">Patterns</Link>
          <Link href="/concepts/sliding-window" className="hover:text-ink">Learn</Link>
          <Link href="/pricing" className="hover:text-ink">Pricing</Link>
        </div>
        <Suspense fallback={<div className="h-11 w-24" aria-hidden="true" />}>
          <AccountArea />
        </Suspense>
      </nav>
    </header>
  );
}

async function AccountArea() {
  const viewer = await getViewer();
  if (!viewer) {
    return (
      <Link href="/login" className="rounded-xl bg-lime px-4 py-2.5 text-[15px] font-semibold text-bg">
        Sign in
      </Link>
    );
  }
  const premium = viewerHasActiveClaim(viewer);
  return (
    <div className="flex items-center gap-3">
      <span
        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
          premium ? "border-amber/50 text-amber" : "border-teal/40 text-teal"
        }`}
      >
        {premium ? "Premium" : "Free"}
      </span>
      <span className="hidden text-sm text-muted sm:inline">{viewer.name}</span>
      <SignOutButton />
    </div>
  );
}
