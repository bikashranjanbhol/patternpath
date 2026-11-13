import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getPlans } from "@/lib/content";
import { formatRupees, quote } from "@/lib/pricing";
import { buttonGhost } from "@/components/ui";
import { PlanCta } from "./plan-cta";

export const metadata: Metadata = { title: "Plans and pricing" };

const PER: Record<string, string> = { monthly: "/ month", sprint: "/ 3 months", yearly: "/ year" };

const ROWS: Array<[string, string, string]> = [
  ["Pattern map and all pattern guides", "yes", "yes"],
  ["Concept articles", "yes", "yes"],
  ["Brute-force solution with step-by-step dry run", "yes", "yes"],
  ["Better and optimal solutions", "no", "yes"],
  ["Dry run for optimized solutions", "no", "yes"],
  ["Code languages", "Python", "Python, Java, C++, JS"],
  ['"Which pattern?" review drills', "5 a day", "Unlimited"],
  ["Company-tagged problem sets", "no", "yes"],
];

const cell = (v: string, premium: boolean) =>
  v === "yes" ? (
    <span className={`font-bold ${premium ? "text-amber" : "text-teal"}`}>✓ Included</span>
  ) : v === "no" ? (
    <span className="text-coral">✗ Not included</span>
  ) : (
    <span className="text-body">{v}</span>
  );

export default async function PricingPage() {
  const plans = await getPlans();
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-16 px-6 py-16">
      <section className="flex flex-col items-center gap-4 text-center">
        <span className="font-mono text-[13px] text-amber">/ plans</span>
        <h1 className="max-w-4xl font-display text-4xl font-bold leading-[1.05] tracking-[-0.035em] md:text-6xl">
          Learn every brute force free. Go Premium to master the optimal.
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-muted">
          Patterns, concept articles and brute-force walkthroughs stay free. Premium unlocks every optimized
          solution with its full dry run. Prices include GST at checkout.
        </p>
      </section>

      <section aria-label="Plans" className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
        <div className="flex flex-col gap-5 rounded-3xl border border-line bg-surface p-7">
          <span className="font-display text-xl font-semibold">Free</span>
          <span className="font-display text-4xl font-bold">₹0</span>
          <Link href="/login" className={buttonGhost}>Start free with Google</Link>
          <ul className="flex flex-col gap-2.5 text-sm text-body">
            <li>✓ All 16 patterns and concept articles</li>
            <li>✓ Every brute-force dry run</li>
            <li className="text-dim">✗ Optimized solutions</li>
            <li className="text-dim">✗ Java, C++ and JS code</li>
          </ul>
        </div>
        {plans.map((p) => {
          const hero = p.id === "sprint";
          const total = quote(p, null).totalPaise;
          return (
            <div
              key={p.id}
              className={`flex flex-col gap-5 rounded-3xl p-7 ${hero ? "border-[1.5px] border-amber bg-[#161410]" : "border border-line bg-surface"}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-display text-xl font-semibold">{p.name}</span>
                {hero && <span className="rounded-full bg-amber px-2.5 py-1 text-[11px] font-bold text-bg">Popular</span>}
              </div>
              <div>
                <span className="font-display text-4xl font-bold">{formatRupees(p.pricePaise)}</span>{" "}
                <span className="text-sm text-dim">{PER[p.id]}</span>
                <p className="mt-1 text-xs text-dim">{formatRupees(total)} with GST</p>
              </div>
              <Suspense fallback={<span className="h-12" />}>
                <PlanCta planId={p.id} hero={hero} />
              </Suspense>
              <ul className="flex flex-col gap-2.5 text-sm text-body">
                <li>✓ Every optimized solution and dry run</li>
                <li>✓ Python, Java, C++ and JS</li>
                <li>✓ Company sets, unlimited drills</li>
                {p.perks.map((perk) => <li key={perk} className="text-ink">+ {perk}</li>)}
              </ul>
            </div>
          );
        })}
      </section>

      <section aria-label="Compare Free and Premium" className="flex flex-col gap-5">
        <h2 className="font-display text-3xl font-bold tracking-tight">Free vs Premium, line by line</h2>
        <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
          <table className="w-full min-w-[640px] border-collapse text-[15px]">
            <thead className="bg-bg-2 text-left">
              <tr>
                <th scope="col" className="w-1/2 px-6 py-4 font-semibold text-muted">Feature</th>
                <th scope="col" className="px-6 py-4 font-semibold">Free</th>
                <th scope="col" className="px-6 py-4 font-semibold text-amber">Premium</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([label, free, prem]) => (
                <tr key={label} className="border-t border-[#1c212c]">
                  <th scope="row" className="px-6 py-4 text-left font-normal">{label}</th>
                  <td className="px-6 py-4">{cell(free, false)}</td>
                  <td className="px-6 py-4">{cell(prem, true)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
