// A problem written as a source file (content/sources/<id>.ts) instead of in the
// admin screens. `npm run record -- <id>` runs each solution, builds the steps and
// writes content/authored/<id>.json, the same file the admin screens save.

import type { Problem, RecordingConfig, Solution } from "@/lib/types";
import { DEFAULT_RECORDING, deriveSteps, type TraceResult } from "./derive";
import { summarize } from "@/lib/summarize";

export interface SolutionSource {
  id: string;
  name: string;
  kind: Solution["kind"];
  tier: Solution["tier"];
  time: string;
  space: string;
  complexityWhy: string;
  bottleneck: string;
  insight: string;
  /** Python. Other languages can be added under `extraCode` (no step mapping). */
  code: string;
  extraCode?: Partial<Record<"java" | "cpp" | "javascript", string>>;
  recording: Partial<RecordingConfig> & Pick<RecordingConfig, "setup" | "call">;
  /**
   * One note per step, in order. Leave it out (or run with --draft) to see the
   * drafted steps first. A count that doesn't match the steps is an error, so
   * notes never drift onto the wrong line after the code changes.
   */
  notes?: string[];
  /** Concept link per step, by step number (1-based). */
  stepConcepts?: Record<number, string>;
}

export interface ProblemSource {
  problem: Omit<Problem, "solutionSummaries">;
  solutions: SolutionSource[];
}

export const defineProblem = (p: ProblemSource) => p;

export function buildSolution(
  problemId: string,
  src: SolutionSource,
  order: number,
  trace: TraceResult,
  opts: { draft: boolean },
): Solution {
  const cfg: RecordingConfig = { ...DEFAULT_RECORDING, ...src.recording };
  if (trace.error) throw new Error(`${src.id}: Python error: ${trace.error}`);
  if (trace.truncated) throw new Error(`${src.id}: too many lines; use a smaller example`);
  const steps = deriveSteps(src.code, trace, cfg);

  if (src.notes && !opts.draft) {
    if (src.notes.length !== steps.length) {
      throw new Error(`${src.id}: ${src.notes.length} notes for ${steps.length} steps. Run with --draft to see the steps.`);
    }
    src.notes.forEach((note, i) => (steps[i].note = note));
  }
  for (const [n, conceptId] of Object.entries(src.stepConcepts ?? {})) {
    const step = steps[Number(n) - 1];
    if (!step) throw new Error(`${src.id}: stepConcepts refers to step ${n}, but there are ${steps.length}`);
    step.conceptId = conceptId;
  }

  const isPair = cfg.pointerMode === "pair" && !!cfg.leftVar && !!cfg.rightVar;
  const input = Object.fromEntries(
    cfg.setup
      .split("\n")
      .map((l) => l.match(/^\s*([A-Za-z_]\w*)\s*=\s*(.+)$/))
      .filter((m): m is RegExpMatchArray => !!m)
      .map((m) => [m[1], m[2].trim()]),
  );

  return {
    id: src.id,
    problemId,
    name: src.name,
    kind: src.kind,
    tier: src.tier,
    order,
    time: src.time,
    space: src.space,
    complexityWhy: src.complexityWhy,
    bottleneck: src.bottleneck,
    insight: src.insight,
    code: { python: src.code, ...src.extraCode },
    input,
    track: { label: cfg.trackVar ?? "", items: trace.trackItems ?? [] },
    pointerStyle: cfg.leftVar && cfg.rightVar ? (isPair ? "pair" : "LR") : cfg.indexVar ? "i" : "none",
    ...(isPair ? { pointerNames: [cfg.leftVar!, cfg.rightVar!] as [string, string] } : {}),
    steps,
    version: 1,
    authoring: cfg,
  };
}

export function buildFile(source: ProblemSource, solutions: Solution[]) {
  return { problem: { ...source.problem, solutionSummaries: summarize(solutions) }, solutions };
}
