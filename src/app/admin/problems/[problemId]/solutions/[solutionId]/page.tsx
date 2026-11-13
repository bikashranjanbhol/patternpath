import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { contentAdmin, contentStore } from "@/lib/data/store";
import { AdminGate, StorageNote } from "../../../../admin-gate";
import { Studio } from "./studio";

export default function SolutionStudioPage(
  props: PageProps<"/admin/problems/[problemId]/solutions/[solutionId]">,
) {
  return (
    <main className="mx-auto flex max-w-[1440px] flex-col gap-5 px-4 py-8 sm:px-6">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <AdminGate>{() => <Load params={props.params} />}</AdminGate>
      </Suspense>
    </main>
  );
}

async function Load({
  params,
}: Pick<PageProps<"/admin/problems/[problemId]/solutions/[solutionId]">, "params">) {
  const { problemId, solutionId } = await params;
  const admin = await contentAdmin();
  const [problem, solutions, concepts] = await Promise.all([
    admin.getProblemAny(problemId),
    contentStore().then((s) => s.listSolutions(problemId)),
    admin.listConcepts(),
  ]);
  if (!problem) notFound();
  const isNew = solutionId === "new";
  const existing = isNew ? null : (solutions.find((s) => s.id === solutionId) ?? null);
  if (!isNew && !existing) notFound();

  return (
    <>
      <nav aria-label="Breadcrumb" className="flex flex-wrap gap-2 text-sm text-dim">
        <Link href="/admin" className="hover:text-ink">Problems</Link>
        <span aria-hidden="true">/</span>
        <Link href={`/admin/problems/${problem.id}`} className="hover:text-ink">#{problem.number} {problem.title}</Link>
        <span aria-hidden="true">/</span>
        <span className="text-ink">{existing ? existing.name : "New solution"}</span>
      </nav>
      <StorageNote />
      <Studio
        problem={problem}
        existing={existing}
        others={solutions.filter((s) => s.id !== solutionId)}
        concepts={concepts.filter((c) => problem.conceptIds.includes(c.id))}
      />
    </>
  );
}
