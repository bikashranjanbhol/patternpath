import { describe, expect, it } from "vitest";
import { solutions } from "@/content/seed";
import { buildApproachViews, PREVIEW_LINES } from "@/lib/walkthrough";

const p567 = solutions.filter((s) => s.problemId === "567-permutation-in-string");

describe("buildApproachViews (Premium access boundary)", () => {
  it("gives free users the brute force in full and locks the rest", () => {
    const views = buildApproachViews(p567, false);
    expect(views.map((v) => v.id)).toEqual(["brute-force", "sort-window", "optimal"]);

    const brute = views[0];
    expect(brute.locked).toBe(false);
    expect(brute.steps.length).toBe(5);
    expect(brute.insight).not.toBeNull();

    for (const v of views.slice(1)) {
      expect(v.locked).toBe(true);
      expect(v.steps).toEqual([]);
      expect(v.insight).toBeNull();
      expect(v.code.python!.split("\n").length).toBe(PREVIEW_LINES);
      expect(v.hiddenLineCount).toBeGreaterThan(0);
      expect(v.stepCount).toBeGreaterThan(0);
    }
  });

  it("never leaks locked code or steps into the serialized view", () => {
    const optimalFull = p567.find((s) => s.id === "optimal")!;
    const json = JSON.stringify(buildApproachViews(p567, false));
    expect(json).not.toContain("del window[out]");
    expect(json).not.toContain(optimalFull.insight);
    expect(json).not.toContain(optimalFull.steps[5].note);
  });

  it("unlocks everything for Premium users", () => {
    const views = buildApproachViews(p567, true);
    expect(views.every((v) => !v.locked)).toBe(true);
    expect(views[2].steps.length).toBe(13);
  });

  it("limits free users to Python", () => {
    const multi = [{ ...p567[0], code: { python: "a", java: "b" } }];
    expect(buildApproachViews(multi, false)[0].languages).toEqual(["python"]);
    expect(buildApproachViews(multi, true)[0].languages).toEqual(["python", "java"]);
  });
});

describe("seed dry runs", () => {
  it("point at real code lines and valid track cells", () => {
    for (const s of solutions) {
      const lineCount = s.code.python!.split("\n").length;
      for (const step of s.steps) {
        for (const line of step.lines.python ?? []) {
          expect(line, `${s.problemId}/${s.id}`).toBeGreaterThanOrEqual(1);
          expect(line, `${s.problemId}/${s.id}`).toBeLessThanOrEqual(lineCount);
        }
        if (step.window) {
          expect(step.window[0]).toBeLessThanOrEqual(step.window[1]);
          expect(step.window[1]).toBeLessThan(s.track.items.length);
        }
      }
      expect(s.steps.at(-1)!.done, `${s.problemId}/${s.id} ends with done`).toBe(true);
    }
  });
});
