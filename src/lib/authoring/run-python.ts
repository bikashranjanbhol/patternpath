"use client";

import type { RecordingConfig, TraceResult } from "./derive";
import { TRACER_PY } from "./tracer-script";

// Runs Python in the admin's browser with Pyodide (served from /pyodide/),
// so recording a dry run needs no server and runs no code on our servers.

interface PyodideLike {
  runPython(code: string): unknown;
  globals: { get(name: string): (...args: unknown[]) => string };
}

let ready: Promise<PyodideLike> | null = null;
const MAX_EVENTS = 1500;

export function loadPython(): Promise<PyodideLike> {
  if (!ready) {
    ready = (async () => {
      const url = "/pyodide/pyodide.mjs";
      const mod = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url)) as {
        loadPyodide(opts: { indexURL: string }): Promise<PyodideLike>;
      };
      const py = await mod.loadPyodide({ indexURL: "/pyodide/" });
      py.runPython(TRACER_PY);
      return py;
    })();
    ready.catch(() => {
      ready = null;
    });
  }
  return ready;
}

export async function recordTrace(code: string, cfg: RecordingConfig): Promise<TraceResult> {
  const py = await loadPython();
  const run = py.globals.get("run_trace");
  const json = run(code, cfg.setup, cfg.call, cfg.trackVar || null, MAX_EVENTS);
  return JSON.parse(json) as TraceResult;
}
