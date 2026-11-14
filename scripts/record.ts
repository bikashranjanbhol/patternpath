// Records the dry runs for a problem written in content/sources/<id>.ts and
// writes content/authored/<id>.json (the same file the admin screens save).
//
//   npm run record -- 1-two-sum            build and write the file
//   npm run record -- 1-two-sum --draft    print the drafted steps to write notes from
//
// Needs python3 on the PATH. The browser studio runs the same tracer in Pyodide.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { TRACER_PY } from "../src/lib/authoring/tracer-script";
import { DEFAULT_RECORDING, deriveSteps, type TraceResult } from "../src/lib/authoring/derive";
import { ProblemSchema, SolutionSchema } from "../src/lib/authoring/schemas";
import { buildFile, buildSolution, type ProblemSource } from "../src/lib/authoring/source";
import type { Solution } from "../src/lib/types";

const args = process.argv.slice(2);
const draft = args.includes("--draft");
const name = args.find((a) => !a.startsWith("--"));
if (!name) {
  console.error("Usage: npm run record -- <problem-id> [--draft]");
  process.exit(1);
}

const root = process.cwd();
const sourcePath = fs.existsSync(name) ? path.resolve(name) : path.join(root, "content", "sources", `${name}.ts`);
const outPath = (id: string) => path.join(root, "content", "authored", `${id}.json`);

function trace(code: string, setup: string, call: string, trackVar: string | null): TraceResult {
  const runner = `${TRACER_PY}\nimport json as _j, sys as _s\n_a = _j.loads(_s.stdin.read())\nprint(run_trace(_a["code"], _a["setup"], _a["call"], _a["track"], 1500))\n`;
  const res = spawnSync("python3", ["-I", "-c", runner], {
    input: JSON.stringify({ code, setup, call, track: trackVar }),
    encoding: "utf8",
  });
  if (res.status !== 0) throw new Error(res.stderr || "python3 failed");
  return JSON.parse(res.stdout.trim().split("\n").pop()!) as TraceResult;
}

function printDraft(sol: Solution, code: string) {
  const lines = code.split("\n");
  console.log(`\n== ${sol.id}: ${sol.steps.length} steps · cells: ${sol.track.items.join(" ")}`);
  sol.steps.forEach((s, i) => {
    const ln = s.lines.python?.[0] ?? 0;
    const vars = s.vars.map((v) => `${v.name}=${v.value}`).join("  ");
    const extra = [s.window ? `win=${s.window.join("..")}` : "", s.outIndex !== null ? `out=${s.outIndex}` : "", s.inIndex !== null ? `in=${s.inIndex}` : ""].filter(Boolean).join(" ");
    console.log(`${String(i + 1).padStart(3)}  L${ln}  ${lines[ln - 1]?.trim()}`);
    console.log(`       ${vars}${extra ? "  | " + extra : ""}${s.check ? `  | check ${s.check.result}` : ""}`);
    console.log(`       draft: ${s.note}`);
  });
}

async function main() {
  const mod = (await import(pathToFileURL(sourcePath).href)) as { default: ProblemSource };
  const source = mod.default;
  const problem = ProblemSchema.parse({ ...source.problem, solutionSummaries: [] });

  // Catch typos in pattern and concept IDs before they reach the site.
  const { patterns, concepts } = await import("../src/content/seed");
  const knownPatterns = new Set(patterns.map((p) => p.id));
  const knownConcepts = new Set(concepts.map((c) => c.id));
  const unknown = [
    ...[problem.primaryPatternId, ...problem.patternIds].filter((id) => !knownPatterns.has(id)).map((id) => `pattern "${id}"`),
    ...problem.conceptIds.filter((id) => !knownConcepts.has(id)).map((id) => `concept "${id}"`),
    ...source.solutions.flatMap((s) => Object.values(s.stepConcepts ?? {})).filter((id) => !knownConcepts.has(id)).map((id) => `step concept "${id}"`),
  ];
  if (unknown.length) {
    console.error(`✗ Unknown ${[...new Set(unknown)].join(", ")}`);
    process.exit(1);
  }

  const previous: Solution[] = fs.existsSync(outPath(problem.id))
    ? (JSON.parse(fs.readFileSync(outPath(problem.id), "utf8")).solutions as Solution[])
    : [];

  let failed = false;
  const solutions: Solution[] = [];
  source.solutions.forEach((src, i) => {
    const cfg = { ...DEFAULT_RECORDING, ...src.recording };
    const result = trace(src.code, cfg.setup, cfg.call, cfg.trackVar);
    try {
      const sol = buildSolution(problem.id, src, i + 1, result, { draft });
      // Bump the version only when what learners see changed.
      const prev = previous.find((p) => p.id === sol.id);
      if (prev) {
        const same = JSON.stringify([prev.code, prev.steps, prev.track]) === JSON.stringify([sol.code, sol.steps, sol.track]);
        sol.version = same ? prev.version : prev.version + 1;
      }
      solutions.push(SolutionSchema.parse(sol) as Solution);
      if (draft) printDraft(sol, src.code);
      else console.log(`✓ ${sol.id}: ${sol.steps.length} steps, returned ${result.returnValue}`);
    } catch (e) {
      failed = true;
      console.error(`✗ ${(e as Error).message}`);
      if (!draft) {
        // Show the steps so the notes can be fixed.
        const steps = deriveSteps(src.code, result, cfg);
        console.error(`  ${src.id} has ${steps.length} steps; run with --draft to see them.`);
      }
    }
  });

  if (draft) {
    console.log("\nDraft only: nothing written.");
  } else if (failed) {
    process.exit(1);
  } else {
    fs.mkdirSync(path.dirname(outPath(problem.id)), { recursive: true });
    fs.writeFileSync(outPath(problem.id), JSON.stringify(buildFile(source, solutions), null, 2) + "\n");
    console.log(`Wrote content/authored/${problem.id}.json`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
