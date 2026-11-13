"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Difficulty, Problem } from "@/lib/types";
import { Field, inputCls, SaveBar, useSaver } from "../../admin-ui";

interface Props {
  initial: Problem;
  isNew: boolean;
  patterns: { id: string; name: string }[];
  concepts: { id: string; title: string }[];
}

const toSlug = (n: number, title: string) =>
  `${n}-${title}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const leetSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export function ProblemForm({ initial, isNew, patterns, concepts }: Props) {
  const router = useRouter();
  const [p, setP] = useState<Problem>(initial);
  const [constraints, setConstraints] = useState(initial.constraints.join("\n"));
  const [tags, setTags] = useState(initial.companyTags.join(", "));
  const saver = useSaver();
  const id = isNew ? toSlug(p.number, p.title) : p.id;
  const set = <K extends keyof Problem>(k: K, v: Problem[K]) => setP((x) => ({ ...x, [k]: v }));

  function payload(): Problem {
    return {
      ...p,
      id,
      patternIds: [p.primaryPatternId, ...p.patternIds.filter((x) => x !== p.primaryPatternId)],
      constraints: constraints.split("\n").map((s) => s.trim()).filter(Boolean),
      companyTags: tags.split(",").map((s) => s.trim()).filter(Boolean),
      examples: p.examples.filter((e) => e.input.trim() && e.output.trim()),
    };
  }

  async function save() {
    const body = payload();
    const ok = await saver.save(`/api/admin/problems/${body.id}`, body);
    if (ok && isNew) router.push(`/admin/problems/${body.id}`);
    else if (ok) router.refresh();
  }

  function download() {
    const blob = new Blob([JSON.stringify(payload(), null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${id || "problem"}.problem.json`;
    a.click();
  }

  return (
    <form
      className="flex flex-col gap-6 rounded-2xl border border-line bg-surface p-6"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <h1 className="font-display text-2xl font-bold">{isNew ? "New problem" : "Problem details"}</h1>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <Field label="LeetCode number">
          <input type="number" min={1} required className={inputCls} value={p.number} onChange={(e) => set("number", Number(e.target.value))} />
        </Field>
        <Field label="Title" wide>
          <input
            required
            className={inputCls}
            value={p.title}
            onChange={(e) => {
              const title = e.target.value;
              setP((x) => {
                const auto = `https://leetcode.com/problems/${leetSlug(x.title)}/`;
                const followTitle = isNew && (x.sourceUrl === auto || x.sourceUrl === "https://leetcode.com/problems/");
                return { ...x, title, sourceUrl: followTitle ? `https://leetcode.com/problems/${leetSlug(title)}/` : x.sourceUrl };
              });
            }}
          />
        </Field>
        <Field label="Difficulty">
          <select className={inputCls} value={p.difficulty} onChange={(e) => set("difficulty", e.target.value as Difficulty)}>
            <option>Easy</option><option>Medium</option><option>Hard</option>
          </select>
        </Field>
        <Field label="Pattern">
          <select className={inputCls} value={p.primaryPatternId} onChange={(e) => set("primaryPatternId", e.target.value)}>
            {patterns.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </Field>
        <Field label="Position in the pattern ladder" hint="1 = first, Easy problems first">
          <input type="number" min={1} className={inputCls} value={p.ladderOrder} onChange={(e) => set("ladderOrder", Number(e.target.value))} />
        </Field>
      </div>
      <Field label="ID (used in the URL)" hint={isNew ? "Made from the number and title" : "Can't be changed"}>
        <input readOnly className={`${inputCls} text-muted`} value={id} />
      </Field>
      <Field label="Description" hint="Write it in your own words. Don't paste LeetCode's text.">
        <textarea required rows={3} className={inputCls} value={p.description} onChange={(e) => set("description", e.target.value)} />
      </Field>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-medium">Examples</legend>
        {p.examples.map((ex, i) => (
          <div key={i} className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-2">
            {(["input", "output", "note"] as const).map((k) => (
              <input
                key={k}
                aria-label={`Example ${i + 1} ${k}`}
                placeholder={k === "input" ? 's1 = "ab", s2 = "eidbaooo"' : k === "output" ? "true" : "Optional note"}
                className={`${inputCls} font-mono`}
                value={ex[k] ?? ""}
                onChange={(e) => set("examples", p.examples.map((x, j) => (j === i ? { ...x, [k]: e.target.value } : x)))}
              />
            ))}
          </div>
        ))}
        {p.examples.length < 3 && (
          <button type="button" className="self-start text-sm text-lime" onClick={() => set("examples", [...p.examples, { input: "", output: "" }])}>
            + Add example
          </button>
        )}
      </fieldset>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
        <Field label="Constraints" hint="One per line">
          <textarea rows={3} className={`${inputCls} font-mono`} value={constraints} onChange={(e) => setConstraints(e.target.value)} />
        </Field>
        <Field label="Link to the original problem">
          <input type="url" required className={inputCls} value={p.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} />
        </Field>
        <Field label="Company tags" hint="Comma separated (Premium sets)">
          <input className={inputCls} value={tags} onChange={(e) => setTags(e.target.value)} />
        </Field>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">Concepts this problem uses (linked from the walkthrough)</legend>
        <div className="flex flex-wrap gap-2">
          {concepts.map((c) => {
            const on = p.conceptIds.includes(c.id);
            return (
              <label key={c.id} className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm ${on ? "border-violet bg-violet/10 text-violet-ink" : "border-line-2 text-muted"}`}>
                <input
                  type="checkbox"
                  className="accent-[#9d8cff]"
                  checked={on}
                  onChange={() => set("conceptIds", on ? p.conceptIds.filter((x) => x !== c.id) : [...p.conceptIds, c.id])}
                />
                {c.title}
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" className="size-4 accent-[#c8f26a]" checked={p.published} onChange={(e) => set("published", e.target.checked)} />
        Published (visible to learners)
      </label>

      <SaveBar saver={saver} onDownload={download} label={isNew ? "Create problem" : "Save problem"} />
    </form>
  );
}
