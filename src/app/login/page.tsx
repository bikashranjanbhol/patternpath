import type { Metadata } from "next";
import { Suspense } from "react";
import { isLocalMode } from "@/lib/config";
import { LoginPanel } from "./login-panel";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="flex flex-wrap">
      <section className="flex min-w-0 flex-[1_1_480px] flex-col gap-8 border-r border-[#1c212c] bg-bg-2 px-8 py-16 md:px-14">
        <h1 className="max-w-lg font-display text-4xl font-bold leading-[1.05] tracking-[-0.03em] md:text-5xl">
          Watch every solution run, one line at a time.
        </h1>
        <p className="max-w-lg text-lg leading-relaxed text-muted">
          Sign in to save your progress and use your plan on any device.
        </p>
        <ul className="flex flex-col gap-3 text-[15px] text-body">
          <li>✓ Brute-force walkthroughs free, forever</li>
          <li>✓ Progress synced across web and mobile</li>
          <li>✓ One tap with your Google account, no new password</li>
        </ul>
      </section>
      <section className="flex min-w-0 flex-[1_1_420px] items-center justify-center px-6 py-16">
        <Suspense fallback={<div className="h-64 w-full max-w-md" />}>
          <LoginPanel localMode={isLocalMode()} />
        </Suspense>
      </section>
    </main>
  );
}
