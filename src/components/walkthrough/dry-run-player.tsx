"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Step } from "@/lib/types";
import type { ApproachView } from "@/lib/walkthrough";
import { ExternalIcon } from "@/components/ui";

const SPEEDS = [0.5, 1, 2] as const;
const BASE_MS = 1500;

interface Props {
  approach: ApproachView;
  stepIndex: number;
  onStep: (i: number) => void;
  conceptTitles: Record<string, string>;
}

export function DryRunPlayer({ approach, stepIndex, onStep, conceptTitles }: Props) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(1);
  const steps = approach.steps;
  const total = steps.length;
  const i = Math.min(stepIndex, total - 1);
  const step = steps[i];
  const prev = i > 0 ? steps[i - 1] : null;

  // Playback stops by itself on the last step.
  const isPlaying = playing && i < total - 1;

  useEffect(() => {
    if (!isPlaying) return;
    const t = setTimeout(() => onStep(i + 1), BASE_MS / speed);
    return () => clearTimeout(t);
  }, [isPlaying, i, speed, onStep]);

  // Keyboard: ← → to step, space to play/pause (only when the player has focus).
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") onStep(Math.min(i + 1, total - 1));
    else if (e.key === "ArrowLeft") onStep(Math.max(i - 1, 0));
    else if (e.key === " " && e.target === e.currentTarget) {
      e.preventDefault();
      togglePlay();
    }
  }

  function togglePlay() {
    if (isPlaying) {
      setPlaying(false);
      return;
    }
    if (i >= total - 1) onStep(0);
    setPlaying(true);
  }

  if (!step) return null;

  return (
    <section
      aria-label="Dry run"
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="flex flex-col gap-6 rounded-2xl border border-line bg-surface p-6 outline-none"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-semibold">Dry run</h2>
        <span className="font-mono text-[13px] text-muted" aria-live="polite">
          Step <span className="text-ink">{i + 1}</span> / {total}
        </span>
      </div>

      <Track approach={approach} step={step} />

      <div className={`flex items-start gap-3.5 rounded-xl border p-4 ${step.done ? "border-lime/40 bg-lime/10" : "border-line-2 bg-surface-2"}`}>
        <span className="flex size-8 flex-none items-center justify-center rounded-lg bg-bg font-mono text-[13px] text-lime">{i + 1}</span>
        <div className="flex min-w-0 flex-1 flex-col gap-2.5">
          <p className="text-base leading-relaxed" aria-live="polite">{step.note}</p>
          {step.conceptId && conceptTitles[step.conceptId] && (
            <Link
              href={`/concepts/${step.conceptId}`}
              target="_blank"
              rel="noopener"
              className="flex items-center gap-2 self-start rounded-full border border-violet/35 bg-violet/10 px-3 py-1.5 text-[13px] text-violet-ink"
            >
              <span className="text-muted">Concept:</span>
              <span className="font-semibold">{conceptTitles[step.conceptId]}</span>
              <ExternalIcon size={12} />
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3.5">
        <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-dim">Variables</span>
          <div className="overflow-hidden rounded-xl border border-line">
            {step.vars.length === 0 && <p className="px-3.5 py-3 text-sm text-dim">No variables yet.</p>}
            {step.vars.map((v, k) => {
              const changed = !prev || prev.vars.find((p) => p.name === v.name)?.value !== v.value;
              return (
                <div
                  key={v.name}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 font-mono text-[13px] ${k > 0 ? "border-t border-[#1c212c]" : ""} ${changed ? "bg-lime/[0.07]" : ""}`}
                >
                  <span className="w-20 flex-none text-[#b6a9ff]">{v.name}</span>
                  <span className="flex-1 break-all">{v.value}</span>
                  {changed && <span className="text-[11px] text-lime">changed</span>}
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.08em] text-dim">Check</span>
          {step.check ? (
            <div className="flex flex-col gap-2.5 rounded-xl border border-line p-3.5 font-mono text-[13px]">
              <span className="rounded-lg bg-surface-2 px-2.5 py-2">{step.check.left}</span>
              <span className="text-center text-dim">{step.check.op}</span>
              <span className="rounded-lg bg-surface-2 px-2.5 py-2">{step.check.right}</span>
              <span
                className={`self-start rounded-full px-3 py-1 font-semibold ${step.check.result ? "bg-lime text-bg" : "bg-coral/15 text-coral"}`}
              >
                {step.check.result ? "True" : "False"}
              </span>
            </div>
          ) : (
            <p className="rounded-xl border border-dashed border-line-2 p-3.5 text-[13px] leading-relaxed text-dim">
              No comparison on this step. Checks appear here when the code tests a condition.
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3.5 border-t border-[#1c212c] pt-4">
        <div className="flex gap-1" role="group" aria-label="Jump to step">
          {steps.map((_, k) => (
            <button
              key={k}
              type="button"
              aria-label={`Go to step ${k + 1}`}
              aria-current={k === i ? "step" : undefined}
              onClick={() => {
                setPlaying(false);
                onStep(k);
              }}
              className="flex h-7 min-w-0 flex-1 items-center"
            >
              <span className={`block h-2 w-full rounded ${k < i ? "bg-lime" : k === i ? "bg-ink" : "bg-line"}`} />
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <IconButton label="Restart" onClick={() => { setPlaying(false); onStep(0); }}>
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />
            </IconButton>
            <IconButton label="Previous step" onClick={() => { setPlaying(false); onStep(Math.max(i - 1, 0)); }}>
              <path d="M15 6l-6 6 6 6" />
            </IconButton>
            <button
              type="button"
              aria-label={isPlaying ? "Pause" : "Play"}
              onClick={togglePlay}
              className="flex size-14 items-center justify-center rounded-full bg-lime text-bg"
            >
              {isPlaying ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
              )}
            </button>
            <IconButton label="Next step" onClick={() => { setPlaying(false); onStep(Math.min(i + 1, total - 1)); }}>
              <path d="M9 6l6 6-6 6" />
            </IconButton>
          </div>
          <div role="group" aria-label="Playback speed" className="flex gap-1 rounded-xl bg-bg p-1">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={speed === s}
                onClick={() => setSpeed(s)}
                className={`min-h-9 min-w-12 rounded-lg font-mono text-[13px] ${speed === s ? "bg-line text-ink" : "text-muted"}`}
              >
                {s}×
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-11 items-center justify-center rounded-xl border border-line-2 bg-surface-2 text-ink"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}

function Track({ approach, step }: { approach: ApproachView; step: Step }) {
  const items = approach.track.items;
  const win = step.window;
  const cols = { gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` };
  const pointer = (k: number) => {
    if (!win) return "";
    if (approach.pointerStyle === "LR") return [k === win[0] ? "L" : "", k === win[1] ? "R" : ""].filter(Boolean).join(" ");
    if (approach.pointerStyle === "i") return k === win[0] ? "i" : "";
    return k === win[0] ? "match" : "";
  };
  return (
    <div className="flex flex-col gap-2" aria-label={`${approach.track.label} with the current window highlighted`}>
      <span className="font-mono text-xs text-dim">{approach.track.label}</span>
      <div className="grid h-4 gap-2.5 text-center font-mono text-[11px] font-semibold" style={cols}>
        {items.map((_, k) => (
          <span key={k} className={step.inIndex === k ? "text-teal" : "text-coral"}>
            {step.inIndex === k ? "in" : step.outIndex === k ? "out" : ""}
          </span>
        ))}
      </div>
      <div className="grid gap-2.5" style={cols}>
        {items.map((ch, k) => {
          const inWin = !!win && k >= win[0] && k <= win[1];
          let cls = "border border-line bg-surface-2 text-dim";
          if (step.done && inWin) cls = "border-2 border-lime bg-lime font-semibold text-bg";
          else if (step.inIndex === k) cls = "border-2 border-teal bg-teal/15 text-ink";
          else if (step.outIndex === k) cls = "border-2 border-dashed border-coral bg-coral/10 text-coral";
          else if (inWin) cls = "border-2 border-lime bg-lime/10 text-ink";
          return (
            <div key={k} className={`flex h-14 items-center justify-center rounded-xl font-mono text-lg sm:text-[22px] ${cls}`}>
              {ch}
            </div>
          );
        })}
      </div>
      <div className="grid gap-2.5 text-center font-mono text-xs text-faint" style={cols}>
        {items.map((_, k) => <span key={k}>{k}</span>)}
      </div>
      <div className="grid h-[18px] gap-2.5 text-center font-mono text-[13px] font-semibold text-lime" style={cols}>
        {items.map((_, k) => <span key={k}>{pointer(k)}</span>)}
      </div>
    </div>
  );
}
