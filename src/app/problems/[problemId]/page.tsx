import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getConcept, getPattern, getProblem, getProblemIds, getSolutions } from "@/lib/content";
import { getViewer, hasPremium } from "@/lib/session";
import type { Problem } from "@/lib/types";
import { buildApproachViews } from "@/lib/walkthrough";
import { DifficultyBadge, ExternalIcon } from "@/components/ui";
import { Walkthrough, type ConceptLink } from "@/components/walkthrough/walkthrough";

export async function generateStaticParams() {
  const ids = await getProblemIds();
  return ids.map((problemId) => ({ problemId }));
}

export default function ProblemPage(props: PageProps<"/problems/[problemId]">) {
  return (
    <main className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
      <Suspense fallback={<p className="p-6 text-muted">Loading problem…</p>}>
        <ProblemView params={props.params} />
      </Suspense>
    </main>
  );
}

async function ProblemView({ params }: Pick<PageProps<"/problems/[problemId]">, "params">) {
  const { problemId } = await params;
  const problem = await getProblem(problemId);
  if (!problem) notFound();
  const [pattern, conceptDocs] = await Promise.all([
    getPattern(problem.primaryPatternId),
    Promise.all(problem.conceptIds.map((id) => getConcept(id))),
  ]);
  const concepts: ConceptLink[] = conceptDocs
    .filter((c) => c !== null)
    .map((c) => ({ id: c.id, title: c.title, summary: c.summary }));

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 text-xs text-dim">
            {pattern && (
              <Link href={`/patterns/${pattern.id}`} className="text-lime underline decoration-dotted">
                {pattern.name}
              </Link>
            )}
            <span aria-hidden="true">·</span>
            <span>Problem {problem.ladderOrder}</span>
          </nav>
          <h1 className="flex flex-wrap items-center gap-3 text-xl font-semibold">
            {problem.number}. {problem.title} <DifficultyBadge difficulty={problem.difficulty} />
          </h1>
        </div>
        {pattern?.conceptId && (
          <Link
            href={`/concepts/${pattern.conceptId}`}
            target="_blank"
            rel="noopener"
            className="flex min-h-11 items-center gap-2.5 rounded-xl border border-violet/35 bg-violet/10 px-3.5 text-sm"
          >
            New to {pattern.name}? <span className="font-semibold text-violet-ink">Read the concept</span>
            <ExternalIcon />
          </Link>
        )}
      </header>

      <ProblemStatement problem={problem} />

      <Suspense fallback={<div className="h-96 rounded-2xl border border-line bg-surface" aria-busy="true" />}>
        <AccessGate problem={problem} concepts={concepts} />
      </Suspense>
    </div>
  );
}

function ProblemStatement({ problem }: { problem: Problem }) {
  return (
    <section className="flex flex-wrap gap-6 rounded-2xl border border-line bg-surface p-5">
      <div className="flex min-w-0 flex-[2_1_360px] flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-dim">The problem</span>
        <p className="leading-relaxed text-body">{problem.description}</p>
        <a href={problem.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 self-start text-[13px] text-muted hover:text-ink">
          Open on LeetCode <ExternalIcon />
        </a>
      </div>
      <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-2">
        {problem.examples.map((ex, i) => (
          <div key={i} className="rounded-xl bg-bg px-4 py-3 font-mono text-[13px] leading-7 text-body">
            <div>{ex.input}</div>
            <div>
              → <span className="text-teal">{ex.output}</span>
              {ex.note && <span className="text-dim">  {ex.note}</span>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/**
 * Runs per request: reads the session and decides which approaches are
 * locked. Only the filtered views reach the browser.
 */
async function AccessGate({ problem, concepts }: { problem: Problem; concepts: ConceptLink[] }) {
  const [viewer, solutions] = await Promise.all([getViewer(), getSolutions(problem.id)]);
  const needsPremium = solutions.some((s) => s.tier === "premium");
  const premium = needsPremium ? await hasPremium(viewer) : false;
  const approaches = buildApproachViews(solutions, premium);
  if (approaches.length === 0) {
    return <p className="text-muted">Solutions for this problem are coming soon.</p>;
  }
  return (
    <Walkthrough
      problemId={problem.id}
      approaches={approaches}
      concepts={concepts}
      signedIn={!!viewer}
      isPremium={premium}
    />
  );
}
