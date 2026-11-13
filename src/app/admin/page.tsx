import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getPatterns } from "@/lib/content";
import { contentAdmin } from "@/lib/data/store";
import { DifficultyBadge } from "@/components/ui";
import { AdminGate, StorageNote } from "./admin-gate";

export const metadata: Metadata = { title: "Authoring" };

export default function AdminHome() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10">
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <AdminGate>{() => <ProblemList />}</AdminGate>
      </Suspense>
    </main>
  );
}

async function ProblemList() {
  const [problems, patterns] = await Promise.all([(await contentAdmin()).listAllProblems(), getPatterns()]);
  const patternName = Object.fromEntries(patterns.map((p) => [p.id, p.name]));
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[13px] text-violet-ink">/ authoring</span>
          <h1 className="font-display text-4xl font-bold tracking-tight">Problems</h1>
        </div>
        <Link href="/admin/problems/new" className="rounded-xl bg-lime px-5 py-3 font-semibold text-bg">
          New problem
        </Link>
      </div>
      <StorageNote />
      <div className="overflow-x-auto rounded-2xl border border-line bg-surface">
        <table className="w-full min-w-[720px] border-collapse text-[15px]">
          <thead className="bg-bg-2 text-left text-sm text-muted">
            <tr>
              <th scope="col" className="px-5 py-3 font-semibold">#</th>
              <th scope="col" className="px-5 py-3 font-semibold">Title</th>
              <th scope="col" className="px-5 py-3 font-semibold">Pattern</th>
              <th scope="col" className="px-5 py-3 font-semibold">Solutions</th>
              <th scope="col" className="px-5 py-3 font-semibold">Status</th>
              <th scope="col" className="px-5 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {problems.map((p) => (
              <tr key={p.id} className="border-t border-[#1c212c]">
                <td className="px-5 py-3.5 font-mono text-dim">{p.number}</td>
                <td className="px-5 py-3.5">
                  <span className="mr-2">{p.title}</span>
                  <DifficultyBadge difficulty={p.difficulty} />
                </td>
                <td className="px-5 py-3.5 text-muted">{patternName[p.primaryPatternId] ?? p.primaryPatternId}</td>
                <td className="px-5 py-3.5 text-muted">
                  {p.solutionSummaries.length}
                  <span className="text-dim"> ({p.solutionSummaries.filter((s) => s.tier === "free").length} free)</span>
                </td>
                <td className="px-5 py-3.5">
                  {p.published ? <span className="text-teal">Published</span> : <span className="text-amber">Draft</span>}
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Link href={`/admin/problems/${p.id}`} className="text-lime underline">Edit</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
