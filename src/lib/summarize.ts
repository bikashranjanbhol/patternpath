import type { Problem, Solution } from "@/lib/types";

/** The per-approach summary stored on a problem (used for lists and badges). */
export function summarize(solutions: Solution[]): Problem["solutionSummaries"] {
  return [...solutions]
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      solutionId: s.id,
      name: s.name,
      kind: s.kind,
      tier: s.tier,
      time: s.time,
      space: s.space,
      stepCount: s.steps.length,
    }));
}
