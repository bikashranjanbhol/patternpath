import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getConcept, getConceptIds, getProblem } from "@/lib/content";
import { CodeBlock } from "@/components/code-block";
import { DifficultyBadge } from "@/components/ui";

export async function generateStaticParams() {
  const ids = await getConceptIds();
  return ids.map((conceptId) => ({ conceptId }));
}

export default function ConceptPage(props: PageProps<"/concepts/[conceptId]">) {
  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      <Suspense fallback={<p className="text-muted">Loading article…</p>}>
        <ConceptView params={props.params} />
      </Suspense>
    </main>
  );
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

async function ConceptView({ params }: Pick<PageProps<"/concepts/[conceptId]">, "params">) {
  const { conceptId } = await params;
  const concept = await getConcept(conceptId);
  if (!concept) notFound();
  const [practice, related] = await Promise.all([
    Promise.all(concept.practiceProblemIds.map((id) => getProblem(id))),
    Promise.all([...concept.prerequisiteIds, ...concept.relatedIds].map((id) => getConcept(id))),
  ]);

  return (
    <div className="flex flex-wrap items-start gap-10">
      <nav aria-label="On this page" className="hidden min-w-0 max-w-60 flex-[1_1_200px] flex-col gap-1 text-sm lg:flex">
        <span className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.08em] text-dim">On this page</span>
        {concept.sections.map((s, i) => (
          <a key={s.heading} href={`#${slug(s.heading)}`} className="rounded-lg px-3 py-2.5 text-muted hover:bg-surface-2 hover:text-ink">
            {i + 1} · {s.heading}
          </a>
        ))}
        {practice.length > 0 && (
          <a href="#practice" className="rounded-lg px-3 py-2.5 text-muted hover:bg-surface-2 hover:text-ink">Practice</a>
        )}
      </nav>

      <article className="flex min-w-0 max-w-3xl flex-[999_1_560px] flex-col gap-12">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2 text-[13px]">
            <span className="rounded-lg bg-lime/15 px-2.5 py-1 font-semibold text-lime">Concept</span>
            <span className="rounded-lg bg-surface-2 px-2.5 py-1 text-muted">{concept.readMinutes} min read</span>
            <span className="rounded-lg bg-surface-2 px-2.5 py-1 text-muted">{concept.level}</span>
          </div>
          <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-[-0.03em] md:text-5xl">{concept.title}</h1>
          <p className="text-lg leading-relaxed text-muted">{concept.summary}</p>
        </header>

        {concept.sections.map((s, i) => (
          <section key={s.heading} id={slug(s.heading)} className="flex scroll-mt-6 flex-col gap-4">
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              {i + 1} · {s.heading}
            </h2>
            {s.paragraphs.map((p) => (
              <p key={p} className="text-[17px] leading-[1.75] text-body">{p}</p>
            ))}
            {s.code && (
              <div className="overflow-hidden rounded-2xl border border-line bg-bg-2">
                <CodeBlock code={s.code} />
              </div>
            )}
          </section>
        ))}

        {practice.length > 0 && (
          <section id="practice" className="flex scroll-mt-6 flex-col gap-3">
            <h2 className="font-display text-2xl font-semibold tracking-tight">Practice in order</h2>
            {practice.map(
              (p) =>
                p && (
                  <Link key={p.id} href={`/problems/${p.id}`} className="flex items-center gap-3.5 rounded-xl border border-line bg-surface px-4 py-3.5 hover:border-dim">
                    <span className="w-14 font-mono text-dim">#{p.number}</span>
                    <span className="flex-1">{p.title}</span>
                    <DifficultyBadge difficulty={p.difficulty} />
                  </Link>
                ),
            )}
          </section>
        )}

        <section className="flex flex-col gap-2 rounded-2xl border border-dashed border-line-2 p-5 text-sm text-muted">
          <h2 className="font-display text-lg font-semibold text-ink">Discussion</h2>
          <p>Questions and tips from other learners will appear here.</p>
        </section>
      </article>

      {related.some(Boolean) && (
        <aside className="flex min-w-0 max-w-72 flex-[1_1_240px] flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-dim">Related concepts</span>
          {related.map(
            (c) =>
              c && (
                <Link key={c.id} href={`/concepts/${c.id}`} className="py-1.5 text-[15px] hover:text-lime">
                  {c.title}
                </Link>
              ),
          )}
        </aside>
      )}
    </div>
  );
}
