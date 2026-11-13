import type { ReactNode } from "react";
import type { Difficulty } from "@/lib/types";

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="28" height="28" rx="8" stroke="#C8F26A" strokeWidth="2" />
      <circle cx="9" cy="20" r="2.5" fill="#C8F26A" />
      <circle cx="15" cy="10" r="2.5" fill="#C8F26A" />
      <circle cx="21" cy="20" r="2.5" fill="#C8F26A" />
      <path d="M10.5 18 L13.5 12 M16.5 12 L19.5 18" stroke="#C8F26A" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

const DIFF: Record<Difficulty, string> = {
  Easy: "text-teal bg-teal/10",
  Medium: "text-amber bg-amber/10",
  Hard: "text-coral bg-coral/10",
};

export function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${DIFF[difficulty]}`}>
      {difficulty}
    </span>
  );
}

export function Eyebrow({ children, tone = "lime" }: { children: ReactNode; tone?: "lime" | "amber" | "dim" }) {
  const color = tone === "lime" ? "text-lime" : tone === "amber" ? "text-amber" : "text-dim";
  return (
    <span className={`text-xs font-semibold uppercase tracking-[0.08em] ${color}`}>{children}</span>
  );
}

export function LockIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true" className={className}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function ExternalIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </svg>
  );
}

export const buttonPrimary =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-lime px-5 py-3 text-[15px] font-semibold text-bg hover:bg-[#d4f685] disabled:opacity-60";
export const buttonPremium =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber px-5 py-3 text-[15px] font-semibold text-bg hover:bg-[#f7c66c] disabled:opacity-60";
export const buttonGhost =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line-2 px-5 py-3 text-[15px] font-medium text-ink hover:border-dim";
