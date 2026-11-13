"use client";

import { useState, type ReactNode } from "react";

export const inputCls =
  "w-full rounded-lg border border-line-2 bg-bg px-3 py-2.5 text-[15px] text-ink placeholder:text-faint";

export function Field({
  label,
  hint,
  wide,
  children,
}: {
  label: string;
  hint?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm font-medium ${wide ? "sm:col-span-2" : ""}`}>
      <span>
        {label}
        {hint && <span className="ml-2 font-normal text-dim">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string };

/** Sends a PUT and keeps a friendly status message. */
export function useSaver() {
  const [state, setState] = useState<SaveState>({ kind: "idle" });
  async function save(url: string, body: unknown): Promise<boolean> {
    setState({ kind: "saving" });
    const res = await fetch(url, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      setState({ kind: "saved" });
      return true;
    }
    const data = await res.json().catch(() => ({}));
    const message =
      data.error === "invalid"
        ? `Please fix: ${(data.issues as { path: (string | number)[]; message: string }[])
            .slice(0, 4)
            .map((i) => `${i.path.join(".") || "form"} (${i.message})`)
            .join("; ")}`
        : data.error === "read_only"
          ? data.message
          : data.error === "forbidden"
            ? "Your session is not an admin session any more. Sign in again."
            : "Couldn't save. Try again.";
    setState({ kind: "error", message });
    return false;
  }
  return { state, save };
}

export function SaveBar({
  saver,
  onDownload,
  label,
}: {
  saver: ReturnType<typeof useSaver>;
  onDownload: () => void;
  label: string;
}) {
  const s = saver.state;
  return (
    <div className="flex flex-wrap items-center gap-3 border-t border-[#1c212c] pt-5">
      <button type="submit" disabled={s.kind === "saving"} className="min-h-11 rounded-xl bg-lime px-5 font-semibold text-bg disabled:opacity-60">
        {s.kind === "saving" ? "Saving…" : label}
      </button>
      <button type="button" onClick={onDownload} className="min-h-11 rounded-xl border border-line-2 px-4 text-sm">
        Download JSON
      </button>
      <span role="status" className={`text-sm ${s.kind === "error" ? "text-coral" : "text-teal"}`}>
        {s.kind === "saved" ? "Saved." : s.kind === "error" ? s.message : ""}
      </span>
    </div>
  );
}
