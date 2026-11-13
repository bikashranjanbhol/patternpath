import type { Metadata } from "next";
import Link from "next/link";
import { getPatterns } from "@/lib/content";

export const metadata: Metadata = { title: "Pattern map" };

export default async function PatternsPage() {
  const patterns = await getPatterns();
  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-14">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-bold tracking-tight">Pattern map</h1>
        <p className="text-muted">Pick a pattern to see how to recognize it and its problems from Easy to Hard.</p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
        {patterns.map((p) => (
          <Link
            key={p.id}
            href={`/patterns/${p.id}`}
            className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 hover:border-dim"
          >
            <span className="font-mono text-xs text-dim">{String(p.order).padStart(2, "0")} · {p.group}</span>
            <span className="font-display text-lg font-semibold">{p.name}</span>
            <span className="text-sm text-muted">
              {p.problemCount > 0 ? `${p.problemCount} problems` : "Coming soon"}
            </span>
          </Link>
        ))}
      </div>
    </main>
  );
}
