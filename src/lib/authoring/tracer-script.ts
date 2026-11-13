// Python run inside Pyodide (in the admin's browser) to record a dry run.
// It executes the solution on an example input with sys.settrace and returns,
// for every executed line of the solution, the variables AFTER that line ran.

export const TRACER_PY = String.raw`
import sys, io, json
from collections.abc import Mapping

REPR_LIMIT = 140

def _fmt(v, depth=0):
    if depth > 3:
        return "…"
    if isinstance(v, bool) or v is None:
        return repr(v)
    if isinstance(v, (int, float)):
        return repr(v)
    if isinstance(v, str):
        return json.dumps(v, ensure_ascii=False)
    if isinstance(v, Mapping):
        parts = []
        for k, val in list(v.items())[:30]:
            key = k if isinstance(k, str) else _fmt(k, depth + 1)
            parts.append(f"{key}:{_fmt(val, depth + 1)}")
        return "{" + ", ".join(parts) + "}"
    if isinstance(v, list):
        return "[" + ", ".join(_fmt(x, depth + 1) for x in v[:40]) + ("…" if len(v) > 40 else "") + "]"
    if isinstance(v, tuple):
        inner = ", ".join(_fmt(x, depth + 1) for x in v[:40])
        return "(" + inner + ("," if len(v) == 1 else "") + ")"
    if isinstance(v, (set, frozenset)):
        return "{" + ", ".join(_fmt(x, depth + 1) for x in list(v)[:40]) + "}"
    return repr(v)

def _short(v):
    s = _fmt(v)
    return s if len(s) <= REPR_LIMIT else s[: REPR_LIMIT - 1] + "…"

def _visible(name, value):
    if name.startswith("__") or name == "self":
        return False
    return not (callable(value) or type(value).__name__ == "module")

def _snapshot(frame):
    return {k: _short(v) for k, v in frame.f_locals.items() if _visible(k, v)}

def _items(v):
    if isinstance(v, str):
        return list(v)
    if isinstance(v, (list, tuple)):
        return [_short(x) for x in v]
    return None

class _TooLong(Exception):
    pass

def run_trace(code, setup, call, track_var, max_events):
    events = []
    out = io.StringIO()
    result = {"events": events, "trackItems": None, "returnValue": None,
              "error": None, "truncated": False, "stdout": ""}
    env = {"__name__": "__solution__"}
    old_stdout = sys.stdout
    sys.stdout = out
    try:
        exec(compile(code, "<solution>", "exec"), env)
        exec(compile(setup, "<setup>", "exec"), env)
        if track_var and track_var in env:
            result["trackItems"] = _items(env[track_var])

        pending = {"ev": None, "frame": None}

        def close_pending():
            if pending["ev"] is not None:
                frame = pending["frame"]
                pending["ev"]["locals"] = _snapshot(frame)
                # The drawn variable can also be made inside the solution
                # (e.g. a sorted copy): take its first value there.
                if (result["trackItems"] is None and track_var
                        and pending["ev"]["depth"] == 1 and track_var in frame.f_locals):
                    result["trackItems"] = _items(frame.f_locals[track_var])
                pending["ev"] = None

        def local_trace(frame, event, arg):
            if event == "line":
                close_pending()
                if len(events) >= max_events:
                    raise _TooLong()
                ev = {"line": frame.f_lineno, "depth": len(_stack), "locals": {}}
                events.append(ev)
                pending["ev"], pending["frame"] = ev, frame
            elif event == "return":
                close_pending()
                if events:
                    events[-1]["returned"] = _short(arg)
                if _stack:
                    _stack.pop()
            return local_trace

        _stack = []

        def global_trace(frame, event, arg):
            # Skip helper frames like <genexpr>, <lambda> and <listcomp>.
            if (event == "call" and frame.f_code.co_filename == "<solution>"
                    and not frame.f_code.co_name.startswith("<")):
                _stack.append(frame.f_code.co_name)
                return local_trace
            return None

        sys.settrace(global_trace)
        try:
            value = eval(compile(call, "<call>", "eval"), env)
        finally:
            sys.settrace(None)
            close_pending()
        result["returnValue"] = _short(value)
    except _TooLong:
        result["truncated"] = True
    except Exception as e:
        result["error"] = f"{type(e).__name__}: {e}"
    finally:
        sys.settrace(None)
        sys.stdout = old_stdout
        result["stdout"] = out.getvalue()[:4000]
    return json.dumps(result)
`;
