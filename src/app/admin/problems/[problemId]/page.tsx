import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getPatterns } from "@/lib/content";
import { contentAdmin } from "@/lib/data/store";
import type { Problem } from "@/lib/types";
import { AdminGate, StorageNote } from "../../admin-gate";
import { ProblemForm } from "./problem-form";

export default function AdminProblemPage(props: PageProps<"/admin/problems/[problemId]">) {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <AdminGate>{() => <Editor params={props.params} />}</AdminGate>
      </Suspense>
    </main>
  );
}

const BLANK: Problem = {
  id: "",
  number: 1,
  title: "",
  difficulty: "Medium",
  primaryPatternId: "sliding-window",
  patternIds: ["sliding-window"],
  ladderOrder: 1,
  description: "",
  examples: [{ input: "", output: "" }],
  constraints: [],
  sourceUrl: "https://leetcode.com/problems/",
  conceptIds: [],
  solutionSummaries: [],
  companyTags: [],
  published: false,
};

async function Editor({ params }: Pick<PageProps<"/admin/problems/[problemId]">, "params">) {
  const { problemId } = await params;
  const admin = await contentAdmin();
  const isNew = problemId === "new";
  const [problem, patterns, concepts] = await Promise.all([
    isNew ? Promise.resolve(BLANK) : admin.getProblemAny(problemId),
    getPatterns(),
    admin.listConcepts(),
  ]);
  if (!problem) notFound();

  return (
    <>
      <nav aria-label="Breadcrumb" className="flex gap-2 text-sm text-dim">
        <Link href="/admin" className="hover:text-ink">Problems</Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink">{isNew ? "New problem" : `#${problem.number} ${problem.title}`}</span>
      </nav>
      <StorageNote />
      <ProblemForm
        initial={problem}
        isNew={isNew}
        patterns={patterns.map((p) => ({ id: p.id, name: p.name }))}
        concepts={concepts}
      />
      {!isNew && (
        <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">Solutions</h2>
            <Link
              href={`/admin/problems/${problem.id}/solutions/new`}
              className="rounded-xl border border-line-2 px-4 py-2.5 text-sm font-semibold"
            >
              Add solution
            </Link>
          </div>
          {problem.solutionSummaries.length === 0 && (
            <p className="text-sm text-muted">No solutions yet. Start with the brute force: it is the free one.</p>
          )}
          {problem.solutionSummaries.map((s, i) => (
            <Link
              key={s.solutionId}
              href={`/admin/problems/${problem.id}/solutions/${s.solutionId}`}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-bg-2 px-4 py-3 hover:border-dim"
            >
              <span className="font-mono text-xs text-dim">0{i + 1}</span>
              <span className="flex-1 font-semibold">{s.name}</span>
              <span className="font-mono text-xs text-muted">{s.time} · {s.stepCount} steps</span>
              <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${s.tier === "free" ? "border-teal/40 text-teal" : "border-amber/40 text-amber"}`}>
                {s.tier === "free" ? "Free" : "Premium"}
              </span>
            </Link>
          ))}
          {problem.published ? (
            // No prefetch: prefetching a page that was a draft moments ago could cache a 404.
            <a href={`/problems/${problem.id}`} target="_blank" rel="noreferrer" className="self-start text-sm text-violet-ink underline">
              View the live page ↗
            </a>
          ) : (
            <p className="text-sm text-dim">Draft: tick Published above and save to show it on the site. Each solution&apos;s studio has a preview.</p>
          )}
        </section>
      )}
    </>
  );
}
