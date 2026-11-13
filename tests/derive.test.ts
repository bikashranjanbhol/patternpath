import { describe, expect, it } from "vitest";
import fixtures from "./fixtures/traces.json";
import { DEFAULT_RECORDING, deriveSteps, setupNames, type TraceEvent, type TraceResult } from "@/lib/authoring/derive";

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

describe("two pointers and branches", () => {
  const code = [
    "def f(a, t):",
    "    left, right = 0, len(a) - 1",
    "    while left < right:",
    "        s = a[left] + a[right]",
    "        if s < t:",
    "            left += 1",
    "        else:",
    "            right -= 1",
  ].join("\n");
  const ev = (line: number, locals: Record<string, string>): TraceEvent => ({ line, depth: 1, locals });
  const base = { a: "[1, 2, 3]", t: "4" };
  const trace: TraceResult = {
    events: [
      ev(2, { ...base, left: "0", right: "2" }),
      ev(3, { ...base, left: "0", right: "2" }),
      ev(4, { ...base, left: "0", right: "2", s: "4" }),
      ev(5, { ...base, left: "0", right: "2", s: "4" }),
      ev(8, { ...base, left: "0", right: "1", s: "4" }),
    ],
    trackItems: ["1", "2", "3"],
    returnValue: "None",
    error: null,
    truncated: false,
    stdout: "",
  };
  const cfg = { ...DEFAULT_RECORDING, setup: "a = [1, 2, 3]\nt = 4", trackVar: "a", leftVar: "left", rightVar: "right", pointerMode: "pair" as const };

  it("marks an if as not taken when the else branch runs next", () => {
    const steps = deriveSteps(code, trace, cfg);
    const ifStep = steps.find((s) => s.lines.python?.[0] === 5)!;
    expect(ifStep.check?.result).toBe(false);
  });

  it("rules out the cell a pair pointer leaves, and adds no 'in' cell", () => {
    const steps = deriveSteps(code, trace, cfg);
    const moved = steps.find((s) => s.lines.python?.[0] === 8)!;
    expect(moved.window).toEqual([0, 1]);
    expect(moved.outIndex).toBe(2);
    expect(moved.inIndex).toBeNull();
  });

  it("keeps a line that only sets a hidden variable", () => {
    const steps = deriveSteps(code, trace, { ...cfg, hiddenVars: ["s"] });
    expect(steps.some((s) => s.lines.python?.[0] === 4)).toBe(true);
  });
});
