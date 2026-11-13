import { describe, expect, it } from "vitest";
import fixtures from "./fixtures/traces.json";
import { DEFAULT_RECORDING, deriveSteps, setupNames, type TraceResult } from "@/lib/authoring/derive";

const p567 = fixtures.p567 as { code: string; trace: TraceResult };
const p3 = fixtures.p3 as { code: string; trace: TraceResult };

describe("setupNames", () => {
  it("finds assigned input names", () => {
    expect([...setupNames('s1 = "ab"\ns2 = "eidbaooo"\na, b = 1, 2')]).toEqual(["s1", "s2", "a", "b"]);
    expect(setupNames("x == 1").size).toBe(0);
  });
});

describe("deriveSteps on #567 (fixed window)", () => {
  const steps = deriveSteps(p567.code, p567.trace, {
    ...DEFAULT_RECORDING,
    setup: 's1 = "ab"\ns2 = "eidbaooo"',
    trackVar: "s2",
    hiddenVars: ["s1", "s2"],
  });

  it("produces steps that end with the return", () => {
    expect(steps.length).toBeGreaterThan(10);
    expect(steps.at(-1)!.done).toBe(true);
    expect(steps.at(-1)!.note).toBe("Return True.");
  });

  it("drafts notes from what changed, without repeating the inputs", () => {
    expect(steps[0].note).toBe("k is now 2.");
    expect(steps[1].note).toBe("need is now {a:1, b:1}.");
  });

  it("records condition checks and whether they passed", () => {
    const first = steps.find((s) => s.check)!;
    expect(first.check).toMatchObject({ left: "window == need", result: false });
    const lastCheck = [...steps].reverse().find((s) => s.check)!;
    expect(lastCheck.check!.result).toBe(true);
  });

  it("hides chosen variables", () => {
    expect(steps.every((s) => s.vars.every((v) => v.name !== "s1" && v.name !== "s2"))).toBe(true);
  });
});

describe("deriveSteps on #3 (variable window)", () => {
  const steps = deriveSteps(p3.code, p3.trace, {
    ...DEFAULT_RECORDING,
    setup: 's = "abcabcbb"',
    trackVar: "s",
    leftVar: "left",
    rightVar: "right",
  });

  it("draws the window from left and right", () => {
    const withWindow = steps.filter((s) => s.window);
    expect(withWindow.length).toBeGreaterThan(5);
    for (const s of withWindow) {
      expect(s.window![0]).toBeLessThanOrEqual(s.window![1]);
      expect(s.window![1]).toBeLessThan(8);
    }
  });

  it("marks letters entering and leaving the window", () => {
    expect(steps.some((s) => s.inIndex !== null)).toBe(true);
    expect(steps.some((s) => s.outIndex !== null)).toBe(true);
  });

  it("returns 3", () => {
    expect(p3.trace.returnValue).toBe("3");
    expect(steps.at(-1)!.note).toBe("Return 3.");
  });

  it("keeps quiet lines when asked", () => {
    const all = deriveSteps(p3.code, p3.trace, { ...DEFAULT_RECORDING, skipQuiet: false });
    expect(all.length).toBe(p3.trace.events.length);
  });
});
