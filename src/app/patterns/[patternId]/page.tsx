import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getPattern, getPatternProblems, getPatterns } from "@/lib/content";
import { CodeBlock } from "@/components/code-block";
import { DifficultyBadge, Eyebrow } from "@/components/ui";

export async function generateStaticParams() {
  const patterns = await getPatterns();
  return patterns.map((p) => ({ patternId: p.id }));
}

export default function PatternPage(props: PageProps<"/patterns/[patternId]">) {
  return (
    <main className="mx-auto max-w-7xl px-6 py-12">
      <Suspense fallback={<p className="text-muted">Loading pattern…</p>}>
        <PatternView params={props.params} />
      </Suspense>
    </main>
  );
}

async function PatternView({ params }: Pick<PageProps<"/patterns/[patternId]">, "params">) {
  const { patternId } = await params;
  const [pattern, problems] = await Promise.all([getPattern(patternId), getPatternProblems(patternId)]);
  if (!pattern) notFound();

  return (
    <div className="flex flex-col gap-10">
      <nav aria-label="Breadcrumb" className="flex gap-2 text-sm text-dim">
        <Link href="/patterns" className="hover:text-ink">Pattern map</Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink">{pattern.name}</span>
      </nav>

      <header className="flex max-w-3xl flex-col gap-4">
        <span className="font-mono text-xs text-dim">Pattern {String(pattern.order).padStart(2, "0")} · {pattern.group}</span>
        <h1 className="font-display text-5xl font-bold tracking-[-0.035em] md:text-6xl">{pattern.name}</h1>
        <p className="text-lg leading-relaxed text-muted">{pattern.summary}</p>
        {pattern.conceptId && (
          <Link href={`/concepts/${pattern.conceptId}`} target="_blank" className="self-start text-sm text-violet-ink underline decoration-dotted">
            New to this? Read the concept article ↗
          </Link>
        )}
      </header>

      <div className="flex flex-wrap items-start gap-7">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-7">
          {pattern.signals.length > 0 && (
            <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-7">
              <h2 className="font-display text-xl font-semibold">Recognize it in the problem statement</h2>
              <ul className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-3">
                {pattern.signals.map((s) => (
                  <li key={s} className="rounded-xl bg-surface-2 p-4 text-[15px] text-body">{s}</li>
                ))}
                {pattern.notSignals.map((s) => (
                  <li key={s} className="rounded-xl bg-surface-2 p-4 text-[15px] text-body">
                    <span className="font-semibold text-coral">Not this if: </span>
                    {s}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {pattern.template.python && (
            <section className="overflow-hidden rounded-2xl border border-line bg-bg-2">
              <h2 className="border-b border-[#1c212c] bg-surface px-5 py-3.5 font-display text-base font-semibold">The template</h2>
              <CodeBlock code={pattern.template.python} />
            </section>
          )}
        </div>

        <aside className="flex min-w-0 flex-[1_1_340px] flex-col gap-2 rounded-2xl border border-line bg-surface p-6">
          <div className="flex items-baseline justify-between pb-3">
            <h2 className="font-display text-xl font-semibold">Problem ladder</h2>
            <Eyebrow tone="dim">Easy → Hard</Eyebrow>
          </div>
          {problems.length === 0 && <p className="text-sm text-muted">Problems for this pattern are coming soon.</p>}
          {problems.map((p) => (
            <Link
              key={p.id}
              href={`/problems/${p.id}`}
              className="flex items-start gap-3 rounded-xl border border-transparent p-3 hover:border-line-2"
            >
              <span className="flex-1">
                <span className="font-mono text-dim">#{p.number}</span> {p.title}
                <span className="mt-1 block text-xs text-dim">{p.solutionSummaries.length} solutions</span>
              </span>
              <DifficultyBadge difficulty={p.difficulty} />
            </Link>
          ))}
        </aside>
      </div>
    </div>
  );
}
