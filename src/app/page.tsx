import Link from "next/link";
import { getPatterns } from "@/lib/content";
import { buttonGhost, buttonPrimary } from "@/components/ui";

export default async function HomePage() {
  const patterns = await getPatterns();
  return (
    <main>
      <section className="mx-auto flex max-w-7xl flex-wrap items-center gap-16 px-6 py-24">
        <div className="flex min-w-0 flex-[1_1_480px] flex-col gap-7">
          <span className="self-start rounded-full border border-line-2 px-3.5 py-2 font-mono text-[13px] text-muted">
            <span className="mr-2 inline-block size-2 rounded-full bg-lime" />
            Thousands of problems · 16 core patterns
          </span>
          <h1 className="font-display text-5xl font-bold leading-[1.02] tracking-[-0.035em] md:text-7xl">
            Stop memorizing solutions. Learn the <span className="text-lime">pattern</span> behind them.
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted">
            PatternPath groups LeetCode problems under the pattern that cracks them. See every
            solution from brute force to optimal, and step through it as a dry run.
          </p>
          <div className="flex flex-wrap gap-3.5">
            <Link href="/problems/567-permutation-in-string" className={buttonPrimary}>
              Watch a dry run
            </Link>
            <Link href="/patterns" className={buttonGhost}>
              Browse all 16 patterns
            </Link>
          </div>
        </div>
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-5 rounded-2xl border border-line bg-surface p-7">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold">#3 Longest Substring Without Repeating Characters</span>
            <span className="rounded-full bg-amber/10 px-2.5 py-1 text-xs font-semibold text-amber">Medium</span>
          </div>
          <div className="grid grid-cols-8 gap-2" aria-hidden="true">
            {"abcabcbb".split("").map((ch, i) => (
              <div
                key={i}
                className={`flex h-12 items-center justify-center rounded-lg font-mono text-lg ${
                  i >= 1 && i <= 3 ? "border-[1.5px] border-lime bg-lime/15 text-ink" : "border border-line bg-surface-2 text-dim"
                }`}
              >
                {ch}
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-lime/30 bg-lime/10 p-4">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-lime">Pattern match</span>
            <p className="font-display text-xl font-semibold">Sliding Window · variable size</p>
          </div>
        </div>
      </section>

      <section className="border-t border-[#1c212c] bg-bg-2">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-24">
          <div className="flex max-w-2xl flex-col gap-3">
            <span className="font-mono text-[13px] text-lime">/ the map</span>
            <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">16 patterns. One map of every problem.</h2>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-4">
            {patterns.map((p) => (
              <Link
                key={p.id}
                href={`/patterns/${p.id}`}
                className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5 hover:border-dim"
              >
                <span className="font-mono text-[13px] text-dim">{String(p.order).padStart(2, "0")} · {p.group}</span>
                <span className="font-display text-xl font-semibold">{p.name}</span>
                <span className="text-sm leading-relaxed text-dim">{p.summary}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-5 px-6 py-24">
        {[
          ["01", "Spot the signals", "Learn the words that give a pattern away: \"contiguous\", \"sorted\", \"k-th largest\".", "text-lime"],
          ["02", "Compare the solutions", "See the brute force, the better idea and the optimal one, and the insight that links them.", "text-violet"],
          ["03", "Watch it run", "Step through each line as a dry run and watch the variables change.", "text-teal"],
        ].map(([n, title, body, color]) => (
          <div key={n} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-8">
            <span className={`font-mono text-4xl ${color}`}>{n}</span>
            <h3 className="font-display text-2xl font-semibold">{title}</h3>
            <p className="leading-relaxed text-muted">{body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
