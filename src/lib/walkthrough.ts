// Builds what the browser is allowed to see for each approach of a problem.
// This is the access boundary for Premium content: a locked approach carries
// no steps, no insight and only the first lines of code.

import type { Language, Solution, Step } from "./types";

export const FREE_LANGUAGES: Language[] = ["python"];
export const PREVIEW_LINES = 3;

export interface ApproachView {
  id: string;
  name: string;
  kind: Solution["kind"];
  tier: Solution["tier"];
  time: string;
  space: string;
  complexityWhy: string;
  bottleneck: string;
  /** Null when locked: the insight gives the next approach away. */
  insight: string | null;
  locked: boolean;
  /** Full code per language when unlocked; the first lines when locked. */
  code: Partial<Record<Language, string>>;
  hiddenLineCount: number;
  languages: Language[];
  track: Solution["track"];
  pointerStyle: Solution["pointerStyle"];
  stepCount: number;
  /** Empty when locked. */
  steps: Step[];
  version: number;
}

export function canView(solution: Pick<Solution, "tier">, isPremium: boolean) {
  return solution.tier === "free" || isPremium;
}

export function buildApproachViews(solutions: Solution[], isPremium: boolean): ApproachView[] {
  return [...solutions]
    .sort((a, b) => a.order - b.order)
    .map((s) => {
      const locked = !canView(s, isPremium);
      const available = (Object.keys(s.code) as Language[]).filter((l) => s.code[l]);
      const languages = isPremium ? available : available.filter((l) => FREE_LANGUAGES.includes(l));
      const code: Partial<Record<Language, string>> = {};
      let hiddenLineCount = 0;
      for (const lang of languages) {
        const full = s.code[lang] ?? "";
        if (locked) {
          const lines = full.split("\n");
          code[lang] = lines.slice(0, PREVIEW_LINES).join("\n");
          hiddenLineCount = Math.max(hiddenLineCount, lines.length - PREVIEW_LINES);
        } else {
          code[lang] = full;
        }
      }
      return {
        id: s.id,
        name: s.name,
        kind: s.kind,
        tier: s.tier,
        time: s.time,
        space: s.space,
        complexityWhy: s.complexityWhy,
        bottleneck: s.bottleneck,
        insight: locked ? null : s.insight,
        locked,
        code,
        hiddenLineCount,
        languages,
        track: s.track,
        pointerStyle: s.pointerStyle,
        stepCount: s.steps.length,
        steps: locked ? [] : s.steps,
        version: s.version,
      };
    });
}
