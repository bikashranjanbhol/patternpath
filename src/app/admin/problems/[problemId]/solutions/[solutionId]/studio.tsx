"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DEFAULT_RECORDING, deriveSteps, setupNames, type TraceResult } from "@/lib/authoring/derive";
import type { Problem, RecordingConfig, Solution, SolutionKind, Step, Tier } from "@/lib/types";
import type { ApproachView } from "@/lib/walkthrough";
import { Walkthrough } from "@/components/walkthrough/walkthrough";
import { Field, inputCls, SaveBar, useSaver } from "../../../../admin-ui";

interface Props {
  problem: Problem;
  existing: Solution | null;
  others: Solution[];
  concepts: { id: string; title: string }[];
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "solution";

/** `s1 = "ab", s2 = "eidbaooo"` → one assignment per line. */
function setupFromExample(input: string | undefined) {
  if (!input) return "";
  return input.split(/,\s*(?=[A-Za-z_]\w*\s*=)/).map((s) => s.trim()).join("\n");
}

function guessCall(code: string, setup: string) {
  const fn = code.match(/^\s*def\s+([A-Za-z_]\w*)\s*\(/m)?.[1];
  if (!fn) return "";
  const inClass = /^\s*class\s+\w+/m.test(code);
  const args = [...setupNames(setup)].join(", ");
  return inClass ? `${code.match(/^\s*class\s+(\w+)/m)![1]}().${fn}(${args})` : `${fn}(${args})`;
}

function guessTrackVar(setup: string) {
  const lines = setup.split("\n").map((l) => l.match(/^\s*([A-Za-z_]\w*)\s*=\s*(["'[])/)).filter(Boolean);
  return lines.length ? lines[lines.length - 1]![1] : null;
}

const POINTER_PAIRS: [string, string][] = [["left", "right"], ["l", "r"], ["lo", "hi"], ["start", "end"], ["i", "j"]];

const STARTER = `def solve(nums, k):
    # Write the solution here. The dry run records every line.
    best = 0
    return best`;

export function Studio({ problem, existing, others, concepts }: Props) {
  const router = useRouter();
  const isNew = !existing;
  const firstSolution = others.length === 0;

  const [meta, setMeta] = useState(() => ({
    name: existing?.name ?? (firstSolution ? "Brute force" : ""),
    kind: existing?.kind ?? ((firstSolution ? "brute" : "optimal") as SolutionKind),
    tier: existing?.tier ?? ((firstSolution ? "free" : "premium") as Tier),
    order: existing?.order ?? others.length + 1,
    time: existing?.time ?? "",
    space: existing?.space ?? "",
    complexityWhy: existing?.complexityWhy ?? "",
    bottleneck: existing?.bottleneck ?? "",
    insight: existing?.insight ?? "",
  }));
  const [code, setCode] = useState(existing?.code.python ?? STARTER);
  const [cfg, setCfg] = useState<RecordingConfig>(() => {
    if (existing?.authoring) return existing.authoring;
    const setup = setupFromExample(problem.examples[0]?.input);
    return { ...DEFAULT_RECORDING, setup, trackVar: guessTrackVar(setup), hiddenVars: [...setupNames(setup)] };
  });
  const [steps, setSteps] = useState<Step[]>(existing?.steps ?? []);
  const [trackItems, setTrackItems] = useState<string[]>(existing?.track.items ?? []);
  const [trace, setTrace] = useState<TraceResult | null>(null);
  const [status, setStatus] = useState<{ kind: "idle" | "loading" | "error" | "ok"; text: string }>({ kind: "idle", text: "" });
  const [previewKey, setPreviewKey] = useState(0);
  const saver = useSaver();

  const id = existing?.id ?? slugify(meta.name);
  const varNames = useMemo(() => {
    const names = new Set<string>();
    trace?.events.forEach((e) => Object.keys(e.locals).forEach((n) => names.add(n)));
    if (!trace) steps.forEach((s) => s.vars.forEach((v) => names.add(v.name)));
    return [...names];
  }, [trace, steps]);

  const isPair = cfg.pointerMode === "pair" && !!cfg.leftVar && !!cfg.rightVar;
  const pointerStyle: Solution["pointerStyle"] =
    cfg.leftVar && cfg.rightVar ? (isPair ? "pair" : "LR") : cfg.indexVar ? "i" : "none";
  const pointerNames = useMemo<[string, string] | undefined>(
    () => (cfg.leftVar && cfg.rightVar ? [cfg.leftVar, cfg.rightVar] : undefined),
    [cfg.leftVar, cfg.rightVar],
  );

  function setMetaField<K extends keyof typeof meta>(k: K, v: (typeof meta)[K]) {
    setMeta((m) => ({ ...m, [k]: v }));
  }

  async function record() {
    const call = cfg.call.trim() || guessCall(code, cfg.setup);
    if (!call) {
      setStatus({ kind: "error", text: "Add the call to run, e.g. checkInclusion(s1, s2)." });
      return;
    }
    if (steps.length > 0 && !confirm("Recording again replaces the current steps and your note edits. Continue?")) return;
    setStatus({ kind: "loading", text: "Starting Python in your browser (first time takes a few seconds)…" });
    try {
      const { recordTrace } = await import("@/lib/authoring/run-python");
      let config = { ...cfg, call };
      const result = await recordTrace(code, config);
      if (result.error) {
        setStatus({ kind: "error", text: `Python error: ${result.error}` });
        return;
      }
      // First recording: guess the window pointers from the variable names.
      if (!config.leftVar && !config.indexVar) {
        const names = new Set(result.events.flatMap((e) => Object.keys(e.locals)));
        const pair = POINTER_PAIRS.find(([a, b]) => names.has(a) && names.has(b));
        // i/j loops compare two cells; other names default to a window (change it under "What to draw").
        if (pair) config = { ...config, leftVar: pair[0], rightVar: pair[1], pointerMode: pair[0] === "i" ? "pair" : config.pointerMode ?? "window" };
      }
      setCfg(config);
      setTrace(result);
      setTrackItems(result.trackItems ?? []);
      const derived = deriveSteps(code, result, config);
      setSteps(derived);
      setPreviewKey((k) => k + 1);
      setStatus({
        kind: "ok",
        text: `Recorded ${result.events.length} lines → ${derived.length} steps. Returned ${result.returnValue}.${result.truncated ? " Stopped early: too many lines; use a smaller example." : ""}`,
      });
    } catch (e) {
      setStatus({ kind: "error", text: `Couldn't start Python: ${(e as Error).message}` });
    }
  }

  function rebuild(next: RecordingConfig) {
    setCfg(next);
    if (!trace) return;
    const fresh = deriveSteps(code, trace, next);
    // Keep edited notes where the step still lands on the same line.
    setSteps(
      fresh.map((s, i) =>
        steps[i] && steps[i].lines.python?.[0] === s.lines.python?.[0]
          ? { ...s, note: steps[i].note, conceptId: steps[i].conceptId }
          : s,
      ),
    );
    setPreviewKey((k) => k + 1);
  }

  function updateStep(i: number, patch: Partial<Step>) {
    setSteps((all) => all.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  }
  function removeStep(i: number) {
    setSteps((all) => {
      const next = all.filter((_, j) => j !== i);
      if (next.length) next[next.length - 1] = { ...next[next.length - 1], done: true };
      return next;
    });
    setPreviewKey((k) => k + 1);
  }

  function buildSolution(): Solution {
    return {
      id,
      problemId: problem.id,
      ...meta,
      code: { ...(existing?.code ?? {}), python: code },
      input: Object.fromEntries(
        cfg.setup
          .split("\n")
          .map((l) => l.match(/^\s*([A-Za-z_]\w*)\s*=\s*(.+)$/))
          .filter((m): m is RegExpMatchArray => !!m)
          .map((m) => [m[1], m[2].trim()]),
      ),
      track: { label: cfg.trackVar ?? "", items: trackItems },
      pointerStyle,
      ...(pointerNames ? { pointerNames } : {}),
      steps,
      version: (existing?.version ?? 0) + 1,
      authoring: cfg,
    };
  }

  const preview: ApproachView = useMemo(
    () => ({
      id,
      name: meta.name || "Untitled",
      kind: meta.kind,
      tier: meta.tier,
      time: meta.time || "?",
      space: meta.space || "?",
      complexityWhy: meta.complexityWhy,
      bottleneck: meta.bottleneck,
      insight: meta.insight,
      locked: false,
      code: { python: code },
      hiddenLineCount: 0,
      languages: ["python"],
      track: { label: cfg.trackVar ?? "", items: trackItems },
      pointerStyle,
      pointerNames,
      stepCount: steps.length,
      steps,
      version: 1,
    }),
    [id, meta, code, cfg.trackVar, trackItems, pointerStyle, pointerNames, steps],
  );

  async function save() {
    if (steps.length === 0) {
      setStatus({ kind: "error", text: "Record the dry run before saving." });
      return;
    }
    const sol = buildSolution();
    const ok = await saver.save(`/api/admin/problems/${problem.id}/solutions/${sol.id}`, sol);
    if (ok && isNew) router.replace(`/admin/problems/${problem.id}/solutions/${sol.id}`);
  }

  function download() {
    const sol = buildSolution();
    const solutions = [...others, sol].sort((a, b) => a.order - b.order);
    const file = { problem, solutions };
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${problem.id}.json`;
    a.click();
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <h1 className="font-display text-3xl font-bold tracking-tight">Solution studio</h1>

      <div className="flex flex-wrap items-start gap-5">
        {/* Code and input */}
        <section className="flex min-w-0 flex-[999_1_520px] flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
          <h2 className="font-display text-lg font-semibold">1 · Code and example</h2>
          <Field label="Python solution">
            <textarea
              spellCheck={false}
              rows={Math.min(24, Math.max(10, code.split("\n").length + 1))}
              className={`${inputCls} font-mono text-sm leading-6`}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Tab") {
                  e.preventDefault();
                  const t = e.currentTarget;
                  const { selectionStart: a, selectionEnd: b } = t;
                  setCode(code.slice(0, a) + "    " + code.slice(b));
                  requestAnimationFrame(() => t.setSelectionRange(a + 4, a + 4));
                }
              }}
            />
          </Field>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            <Field label="Example input" hint="One Python assignment per line">
              <textarea rows={3} spellCheck={false} className={`${inputCls} font-mono text-sm`} value={cfg.setup} onChange={(e) => setCfg({ ...cfg, setup: e.target.value })} />
            </Field>
            <Field label="Call to run" hint="Leave empty to guess">
              <input spellCheck={false} className={`${inputCls} font-mono text-sm`} placeholder={guessCall(code, cfg.setup) || "solve(nums, k)"} value={cfg.call} onChange={(e) => setCfg({ ...cfg, call: e.target.value })} />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" onClick={record} disabled={status.kind === "loading"} className="min-h-11 rounded-xl bg-violet px-5 font-semibold text-bg disabled:opacity-60">
              {status.kind === "loading" ? "Recording…" : steps.length ? "Record again" : "Record dry run"}
            </button>
            <span role="status" className={`text-sm ${status.kind === "error" ? "text-coral" : status.kind === "ok" ? "text-teal" : "text-muted"}`}>
              {status.text}
            </span>
          </div>
          {trace?.stdout && (
            <pre className="max-h-32 overflow-auto rounded-lg bg-bg p-3 font-mono text-xs text-muted">{trace.stdout}</pre>
          )}
        </section>

        {/* Details and visual */}
        <section className="flex min-w-0 flex-[1_1_360px] flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
          <h2 className="font-display text-lg font-semibold">2 · Details</h2>
          <Field label="Approach name">
            <input required className={inputCls} value={meta.name} onChange={(e) => setMetaField("name", e.target.value)} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Kind">
              <select className={inputCls} value={meta.kind} onChange={(e) => setMetaField("kind", e.target.value as SolutionKind)}>
                <option value="brute">Brute force</option><option value="better">Better</option><option value="optimal">Optimal</option>
              </select>
            </Field>
            <Field label="Access">
              <select className={inputCls} value={meta.tier} onChange={(e) => setMetaField("tier", e.target.value as Tier)}>
                <option value="free">Free</option><option value="premium">Premium</option>
              </select>
            </Field>
            <Field label="Order">
              <input type="number" min={1} className={inputCls} value={meta.order} onChange={(e) => setMetaField("order", Number(e.target.value))} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Time"><input required className={`${inputCls} font-mono`} placeholder="O(n)" value={meta.time} onChange={(e) => setMetaField("time", e.target.value)} /></Field>
            <Field label="Space"><input required className={`${inputCls} font-mono`} placeholder="O(1)" value={meta.space} onChange={(e) => setMetaField("space", e.target.value)} /></Field>
          </div>
          <Field label="Why that complexity"><textarea rows={2} className={inputCls} value={meta.complexityWhy} onChange={(e) => setMetaField("complexityWhy", e.target.value)} /></Field>
          <Field label="Bottleneck" hint="What makes it slow"><textarea rows={2} className={inputCls} value={meta.bottleneck} onChange={(e) => setMetaField("bottleneck", e.target.value)} /></Field>
          <Field label="Key insight" hint="Leads to the next approach"><textarea rows={2} className={inputCls} value={meta.insight} onChange={(e) => setMetaField("insight", e.target.value)} /></Field>

          <h2 className="pt-2 font-display text-lg font-semibold">3 · What to draw</h2>
          <Field label="Show as cells" hint="Record again after changing">
            <select className={inputCls} value={cfg.trackVar ?? ""} onChange={(e) => setCfg({ ...cfg, trackVar: e.target.value || null })}>
              <option value="">Nothing</option>
              {[...new Set([...setupNames(cfg.setup), ...varNames, ...(cfg.trackVar ? [cfg.trackVar] : [])])].map((n) => <option key={n}>{n}</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Window start (L)">
              <VarSelect names={varNames} value={cfg.leftVar ?? cfg.indexVar} onChange={(v) => rebuild({ ...cfg, ...(cfg.indexVar && !cfg.rightVar ? { indexVar: v } : { leftVar: v }) })} />
            </Field>
            <Field label="Window end (R)" hint="or size">
              <VarSelect names={varNames} value={cfg.rightVar ?? cfg.sizeVar} onChange={(v) => rebuild(cfg.indexVar && !cfg.rightVar ? { ...cfg, sizeVar: v } : { ...cfg, rightVar: v })} />
            </Field>
          </div>
          {!cfg.indexVar && (
            <Field label="Draw the two pointers as">
              <select className={inputCls} value={cfg.pointerMode ?? "window"} onChange={(e) => rebuild({ ...cfg, pointerMode: e.target.value as "window" | "pair" })}>
                <option value="window">A window: shade every cell between them</option>
                <option value="pair">Two pointers: mark only their two cells</option>
              </select>
            </Field>
          )}
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              className="accent-[#c8f26a]"
              checked={!!cfg.indexVar}
              onChange={(e) =>
                rebuild(
                  e.target.checked
                    ? { ...cfg, indexVar: cfg.leftVar, sizeVar: cfg.rightVar, leftVar: null, rightVar: null }
                    : { ...cfg, leftVar: cfg.indexVar, rightVar: cfg.sizeVar, indexVar: null, sizeVar: null },
                )
              }
            />
            Window is a start index plus a size (like i and k)
          </label>
          {varNames.length > 0 && (
            <fieldset>
              <legend className="mb-2 text-sm font-medium">Hide variables</legend>
              <div className="flex flex-wrap gap-1.5">
                {varNames.map((n) => {
                  const hidden = cfg.hiddenVars.includes(n);
                  return (
                    <label key={n} className={`flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border px-3 font-mono text-xs ${hidden ? "border-coral/50 text-coral line-through" : "border-line-2 text-muted"}`}>
                      <input type="checkbox" className="sr-only" checked={hidden} onChange={() => rebuild({ ...cfg, hiddenVars: hidden ? cfg.hiddenVars.filter((x) => x !== n) : [...cfg.hiddenVars, n] })} />
                      {n}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          )}
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" className="accent-[#c8f26a]" checked={cfg.skipQuiet} onChange={(e) => rebuild({ ...cfg, skipQuiet: e.target.checked })} />
            Skip lines that change nothing
          </label>
          {!trace && steps.length > 0 && (
            <p className="text-xs text-dim">Record again to change what is drawn; saved steps are shown below. A variable made inside the solution is drawn from its first value.</p>
          )}
        </section>
      </div>

      {/* Steps */}
      <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">4 · Steps ({steps.length})</h2>
          <span className="text-sm text-dim">Rewrite each note in plain words. The first draft says what changed.</span>
        </div>
        {steps.length === 0 && <p className="text-sm text-muted">Record the dry run to create steps.</p>}
        <ol className="flex flex-col gap-2">
          {steps.map((s, i) => (
            <li key={i} className="flex flex-wrap items-start gap-3 rounded-xl border border-line bg-bg-2 p-3">
              <span className="flex w-16 flex-none flex-col gap-1 font-mono text-xs">
                <span className="text-ink">#{i + 1}</span>
                <span className="text-dim">line {s.lines.python?.join(", ")}</span>
                {s.check && <span className={s.check.result ? "text-lime" : "text-coral"}>{s.check.result ? "True" : "False"}</span>}
              </span>
              <textarea
                aria-label={`Step ${i + 1} note`}
                rows={2}
                className={`${inputCls} min-w-0 flex-[1_1_320px] text-sm`}
                value={s.note}
                onChange={(e) => updateStep(i, { note: e.target.value })}
              />
              <span className="flex min-w-0 flex-[0_1_220px] flex-col gap-1 font-mono text-[11px] text-dim">
                {s.vars.slice(0, 4).map((v) => (
                  <span key={v.name} className="truncate"><span className="text-[#b6a9ff]">{v.name}</span> {v.value}</span>
                ))}
              </span>
              <span className="flex flex-col gap-2">
                <select aria-label={`Step ${i + 1} concept`} className={`${inputCls} py-1.5 text-xs`} value={s.conceptId ?? ""} onChange={(e) => updateStep(i, { conceptId: e.target.value || null })}>
                  <option value="">No concept link</option>
                  {concepts.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
                <button type="button" onClick={() => removeStep(i)} className="min-h-9 rounded-lg border border-line-2 text-xs text-coral">
                  Remove step
                </button>
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* Preview */}
      <section className="flex flex-col gap-3">
        <h2 className="font-display text-lg font-semibold">5 · Preview</h2>
        {steps.length > 0 ? (
          <Walkthrough
            key={previewKey}
            problemId={problem.id}
            approaches={[preview]}
            concepts={concepts.map((c) => ({ ...c, summary: "" }))}
            signedIn
            isPremium
          />
        ) : (
          <p className="rounded-2xl border border-dashed border-line-2 p-6 text-sm text-muted">The preview appears after recording.</p>
        )}
      </section>

      <div className="rounded-2xl border border-line bg-surface p-5">
        <SaveBar saver={saver} onDownload={download} label={isNew ? "Save solution" : "Save changes"} />
      </div>
    </form>
  );
}

function VarSelect({ names, value, onChange }: { names: string[]; value: string | null; onChange: (v: string | null) => void }) {
  return (
    <select className={`${inputCls} font-mono text-sm`} value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">None</option>
      {names.map((n) => <option key={n}>{n}</option>)}
      {value && !names.includes(value) && <option>{value}</option>}
    </select>
  );
}
