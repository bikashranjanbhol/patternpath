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
};

const CHECK_RE = /^(if|elif|while)\s+(.+?):\s*(.*)$/;

const indent = (s: string) => s.length - s.trimStart().length;
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

    // Condition checks: the branch was taken if the next line is inside the block,
    // or (for a one-line `if …: return …`) if this line returned.
    let check: Step["check"] = null;
    const m = text.trim().match(CHECK_RE);
    if (m) {
      const inlineBody = m[3].trim().length > 0;
      const taken = inlineBody
        ? ev.returned !== undefined || (next !== undefined && next.line === ev.line)
        : next !== undefined &&
          next.line > ev.line &&
          indent(lines[next.line - 1] ?? "") > indent(text);
      check = { left: m[2].trim(), op: "", right: "", result: taken };
    }

    const window = windowOf(ev.locals, cfg, length);
    const left = cfg.leftVar ? asInt(ev.locals[cfg.leftVar]) : null;
    const right = cfg.rightVar ? asInt(ev.locals[cfg.rightVar]) : null;
    const inIndex = right !== null && prevRight !== null && right > prevRight ? right : null;
    const outIndex = left !== null && prevLeft !== null && left > prevLeft ? prevLeft : null;
    const windowMoved = JSON.stringify(window) !== JSON.stringify(prevWindowRaw);

    const quiet =
      changed.length === 0 && !check && ev.returned === undefined && !windowMoved;
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
