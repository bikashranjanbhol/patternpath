// Turns a raw trace (one event per executed line) into editable dry-run steps:
// highlighted lines, variables, window and pointers, condition checks and a
// first-draft note. Pure, so it can be unit tested without Python.

import type { RecordingConfig, Step, StepVar } from "@/lib/types";

export type { RecordingConfig };

export interface TraceEvent {
  line: number;
  depth: number;
  /** Variables after the line ran, already formatted for display. */
  locals: Record<string, string>;
  returned?: string;
}

export interface TraceResult {
  events: TraceEvent[];
  trackItems: string[] | null;
  returnValue: string | null;
  error: string | null;
  truncated: boolean;
  stdout: string;
}

export const DEFAULT_RECORDING: RecordingConfig = {
  setup: "",
  call: "",
  trackVar: null,
  leftVar: null,
  rightVar: null,
  indexVar: null,
  sizeVar: null,
  hiddenVars: [],
  skipQuiet: true,
  pointerMode: "window",
};

const CHECK_RE = /^(if|elif|while)\s+(.+?):\s*(.*)$/;
/** `x = …`, `a, b = …`, `x += …`: worth a step even when the value stays the same. */
const ASSIGN_RE = /^[A-Za-z_][\w.,\s\[\]]*?\s*(?:[-+*/%]|\/\/)?=(?!=)/;

const indent = (s: string) => s.length - s.trimStart().length;

/** Last line (1-based) of the block that starts after `line`, e.g. an if body before its else. */
function blockEnd(lines: string[], line: number): number {
  const own = indent(lines[line - 1] ?? "");
  let end = line;
  for (let k = line + 1; k <= lines.length; k++) {
    const text = lines[k - 1];
    if (text.trim() === "" || text.trim().startsWith("#")) continue;
    if (indent(text) <= own) break;
    end = k;
  }
  return end;
}
const asInt = (v: string | undefined) => (v !== undefined && /^-?\d+$/.test(v) ? Number(v) : null);

/** Names assigned in the setup block (these are inputs, not interesting changes). */
export function setupNames(setup: string): Set<string> {
  const names = new Set<string>();
  for (const line of setup.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)*)\s*=(?!=)/);
    if (m) m[1].split(",").forEach((n) => names.add(n.trim()));
  }
  return names;
}

function windowOf(
  locals: Record<string, string>,
  cfg: RecordingConfig,
  length: number,
): [number, number] | null {
  let w: [number, number] | null = null;
  if (cfg.leftVar && cfg.rightVar) {
    const l = asInt(locals[cfg.leftVar]);
    const r = asInt(locals[cfg.rightVar]);
    if (l !== null && r !== null) w = [l, r];
  } else if (cfg.indexVar) {
    const i = asInt(locals[cfg.indexVar]);
    const size = cfg.sizeVar ? (asInt(locals[cfg.sizeVar]) ?? (Number(cfg.sizeVar) || null)) : 1;
    if (i !== null && size) w = [i, i + size - 1];
  }
  if (!w) return null;
  const [a, b] = w;
  if (a > b || a < 0 || (length > 0 && b >= length)) return null;
  return w;
}

/** Cell that just stopped being a candidate, and cell that just entered. */
function movement(
  cfg: RecordingConfig,
  left: number | null,
  right: number | null,
  prevLeft: number | null,
  prevRight: number | null,
): { inIndex: number | null; outIndex: number | null } {
  if (cfg.pointerMode === "pair") {
    // Two pointers: only a single one-cell move toward the other one rules a cell out.
    const leftMoved = left !== null && prevLeft !== null && left === prevLeft + 1;
    const rightMoved = right !== null && prevRight !== null && right === prevRight - 1;
    const leftSame = left === prevLeft;
    const rightSame = right === prevRight;
    if (leftMoved && rightSame) return { inIndex: null, outIndex: prevLeft };
    if (rightMoved && leftSame) return { inIndex: null, outIndex: prevRight };
    return { inIndex: null, outIndex: null };
  }
  // A window that jumped back (a reset, e.g. a new binary search) has no in/out marks.
  const movedBack =
    (left !== null && prevLeft !== null && left < prevLeft) ||
    (right !== null && prevRight !== null && right < prevRight);
  if (movedBack) return { inIndex: null, outIndex: null };
  return {
    inIndex: right !== null && prevRight !== null && right > prevRight ? right : null,
    outIndex: left !== null && prevLeft !== null && left > prevLeft ? prevLeft : null,
  };
}

function draftNote(
  text: string,
  changed: StepVar[],
  check: Step["check"],
  returned: string | undefined,
): string {
  if (returned !== undefined && /^\s*return\b/.test(text)) return `Return ${returned}.`;
  if (check) return `Check ${check.left}: ${check.result ? "True" : "False"}.`;
  if (changed.length > 0) {
    const parts = changed.slice(0, 3).map((v) => `${v.name} is now ${v.value}`);
    return `${parts.join(", ")}${changed.length > 3 ? ", …" : ""}.`;
  }
  return `Run \`${text.trim()}\`.`;
}

export function deriveSteps(code: string, trace: TraceResult, cfg: RecordingConfig): Step[] {
  const lines = code.split("\n");
  const inputs = setupNames(cfg.setup);
  const hidden = new Set(cfg.hiddenVars);
  const length = trace.trackItems?.length ?? 0;
  const order: string[] = [];
  const steps: Step[] = [];
  let prev: Record<string, string> = {};
  let prevWindowRaw: [number, number] | null = null;
  let prevLeft: number | null = null;
  let prevRight: number | null = null;

  trace.events.forEach((ev, k) => {
    const text = lines[ev.line - 1] ?? "";
    const next = trace.events[k + 1];

    for (const name of Object.keys(ev.locals)) if (!order.includes(name)) order.push(name);
    const vars: StepVar[] = order
      .filter((n) => n in ev.locals && !hidden.has(n))
      .map((n) => ({ name: n, value: ev.locals[n] }));
    const changed = vars.filter(
      (v) => prev[v.name] !== v.value && !(inputs.has(v.name) && !(v.name in prev) && k === 0),
    );
    const changedForNote = changed.filter((v) => !(inputs.has(v.name) && !(v.name in prev)));

    // Condition checks: the branch was taken if the next line is inside its own
    // block (not a following else/elif), or (for a one-line `if …: return …`)
    // if this line returned.
    let check: Step["check"] = null;
    const m = text.trim().match(CHECK_RE);
    if (m) {
      const inlineBody = m[3].trim().length > 0;
      const taken = inlineBody
        ? ev.returned !== undefined || (next !== undefined && next.line === ev.line)
        : next !== undefined && next.line > ev.line && next.line <= blockEnd(lines, ev.line);
      check = { left: m[2].trim(), op: "", right: "", result: taken };
    }

    const window = windowOf(ev.locals, cfg, length);
    const left = cfg.leftVar ? asInt(ev.locals[cfg.leftVar]) : null;
    const right = cfg.rightVar ? asInt(ev.locals[cfg.rightVar]) : null;
    const { inIndex, outIndex } = movement(cfg, left, right, prevLeft, prevRight);
    const windowMoved = JSON.stringify(window) !== JSON.stringify(prevWindowRaw);

    // Hidden variables don't show, but a line that sets one still did something.
    const anyChanged = Object.keys(ev.locals).some(
      (n) => prev[n] !== ev.locals[n] && !(inputs.has(n) && !(n in prev)),
    );
    const quiet =
      changed.length === 0 &&
      !anyChanged &&
      !check &&
      ev.returned === undefined &&
      !windowMoved &&
      !ASSIGN_RE.test(text.trim());
    prev = ev.locals;
    prevWindowRaw = window;
    if (left !== null) prevLeft = left;
    if (right !== null) prevRight = right;
    if (cfg.skipQuiet && quiet) return;

    steps.push({
      lines: { python: [ev.line] },
      note: draftNote(text, changedForNote, check, ev.returned),
      vars,
      window,
      inIndex,
      outIndex,
      check,
      conceptId: null,
      done: false,
    });
  });

  if (steps.length > 0) steps[steps.length - 1].done = true;
  return steps;
}
