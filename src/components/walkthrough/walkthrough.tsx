"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { TOKEN_CLASS, tokenizeLine } from "@/lib/highlight";
import { LANGUAGE_LABELS, type Language } from "@/lib/types";
import type { ApproachView } from "@/lib/walkthrough";
import { buttonGhost, buttonPremium, ExternalIcon, LockIcon } from "@/components/ui";
import { DryRunPlayer } from "./dry-run-player";

export interface ConceptLink {
  id: string;
  title: string;
  summary: string;
}

interface Props {
  problemId: string;
  approaches: ApproachView[];
  concepts: ConceptLink[];
  signedIn: boolean;
  isPremium: boolean;
}

const KIND_LABEL = { brute: "Brute force", better: "Better", optimal: "Optimal" } as const;

export function Walkthrough({ problemId, approaches, concepts, signedIn, isPremium }: Props) {
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState(0);
  const approach = approaches[index];
  const [language, setLanguage] = useState<Language>("python");
  const lang = approach.languages.includes(language) ? language : approach.languages[0];
  const onStep = useCallback((i: number) => setStep(i), []);
  const conceptTitles = Object.fromEntries(concepts.map((c) => [c.id, c.title]));
  const activeLines = approach.locked ? [] : (approach.steps[step]?.lines[lang] ?? []);
  const unlockHref = `/pricing?next=${encodeURIComponent(`/problems/${problemId}`)}`;

  function pick(i: number) {
    setIndex(i);
    setStep(0);
  }

  return (
    <div className="flex flex-wrap items-start gap-3.5">
      {/* Approaches, insight and concepts */}
      <aside aria-label="Approaches" className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5">
        <section className="flex flex-col gap-2.5 rounded-2xl border border-line bg-surface p-4">
          <div className="flex items-center justify-between px-1">
            <h2 className="font-display text-[17px] font-semibold">Approaches</h2>
            <span className="text-xs text-dim">{approaches.length} solutions</span>
          </div>
          <div role="tablist" aria-label="Solution approaches" className="flex flex-col gap-2">
            {approaches.map((a, i) => {
              const selected = i === index;
              const badge = a.locked ? "Premium" : a.tier === "free" ? "Free" : KIND_LABEL[a.kind];
              return (
                <button
                  key={a.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => pick(i)}
                  className={`flex w-full flex-col items-start gap-1.5 rounded-xl border-[1.5px] p-3.5 text-left ${
                    selected ? "border-lime bg-lime/[0.08]" : "border-line bg-bg-2 hover:border-line-2"
                  }`}
                >
                  <span className="flex w-full items-center justify-between gap-2">
                    <span className="font-mono text-xs text-dim">0{i + 1} · {KIND_LABEL[a.kind]}</span>
                    <span
                      className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                        a.locked ? "border-amber/40 text-amber" : a.tier === "free" ? "border-teal/40 text-teal" : "border-lime/40 text-lime"
                      }`}
                    >
                      {a.locked && <LockIcon size={11} />}
                      {badge}
                    </span>
                  </span>
                  <span className="text-[15px] font-semibold">{a.name}</span>
                  <span className="flex gap-3.5 font-mono text-xs text-muted">
                    <span>T {a.time}</span>
                    <span>S {a.space}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col gap-3 rounded-2xl bg-surface-2 px-5 py-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-coral">Bottleneck</span>
            <p className="text-sm leading-relaxed text-body">{approach.bottleneck}</p>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-lime">Key insight</span>
            {approach.insight ? (
              <p className="text-sm leading-relaxed text-body">{approach.insight}</p>
            ) : (
              <Link href={unlockHref} className="flex items-center gap-2 text-sm text-amber">
                <LockIcon size={14} /> Unlock with Premium
              </Link>
            )}
          </div>
        </section>

        {concepts.length > 0 && (
          <section className="flex flex-col rounded-2xl border border-line bg-surface px-5 py-4">
            <div className="flex items-baseline justify-between pb-2">
              <h2 className="font-display text-base font-semibold">Concepts in this problem</h2>
              <span className="text-xs text-dim">opens in new tab</span>
            </div>
            {concepts.map((c, k) => (
              <Link
                key={c.id}
                href={`/concepts/${c.id}`}
                target="_blank"
                rel="noopener"
                className={`flex items-center gap-3 py-3 ${k > 0 ? "border-t border-[#1c212c]" : ""}`}
              >
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm font-semibold">{c.title}</span>
                  <span className="line-clamp-2 text-xs leading-snug text-dim">{c.summary}</span>
                </span>
                <span className="text-dim"><ExternalIcon /></span>
              </Link>
            ))}
          </section>
        )}
      </aside>

      {/* Dry run or paywall */}
      <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-3.5">
        {approach.locked ? (
          <Paywall approach={approach} unlockHref={unlockHref} signedIn={signedIn} onWatchFree={() => pick(0)} problemId={problemId} />
        ) : (
          <DryRunPlayer key={approach.id} approach={approach} stepIndex={step} onStep={onStep} conceptTitles={conceptTitles} />
        )}
      </div>

      {/* Code and complexity */}
      <section aria-label="Code" className="flex min-w-0 flex-[1_1_400px] flex-col gap-3.5">
        <div className="overflow-hidden rounded-2xl border border-line bg-bg-2">
          <div className="flex items-center justify-between gap-3 border-b border-[#1c212c] bg-surface px-4 py-2.5">
            <span className="text-sm font-semibold">{approach.name}</span>
            <label className="flex items-center gap-2 text-[13px] text-muted">
              <span className="sr-only">Language</span>
              <select
                value={lang}
                onChange={(e) => setLanguage(e.target.value as Language)}
                className="rounded-lg border border-line-2 bg-surface-2 px-2.5 py-2 text-[13px] text-ink"
              >
                {approach.languages.map((l) => (
                  <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>
                ))}
              </select>
            </label>
          </div>
          <CodeLines code={approach.code[lang] ?? ""} active={activeLines} />
          {approach.locked && (
            <div className="mx-4 mb-4 flex flex-col gap-2.5 rounded-xl border border-dashed border-amber/30 bg-surface p-4" aria-label="Locked code">
              {[72, 58, 64, 44].map((w, k) => (
                <span key={k} className="block h-2.5 rounded bg-line" style={{ width: `${w}%`, marginLeft: k * 12 }} />
              ))}
              <Link href={unlockHref} className="mt-1 flex items-center gap-2 text-[13px] font-semibold text-amber">
                <LockIcon size={14} /> {approach.hiddenLineCount} more lines with Premium
              </Link>
            </div>
          )}
          {!isPremium && !approach.locked && (
            <p className="border-t border-[#1c212c] px-4 py-3 text-xs text-dim">
              Java, C++ and JavaScript are included with Premium.
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3.5">
          <div className="flex flex-col gap-1 rounded-xl border border-line bg-surface px-4 py-3.5">
            <span className="text-xs text-dim">Time</span>
            <span className="font-mono text-xl">{approach.time}</span>
          </div>
          <div className="flex flex-col gap-1 rounded-xl border border-line bg-surface px-4 py-3.5">
            <span className="text-xs text-dim">Space</span>
            <span className="font-mono text-xl">{approach.space}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface px-4 py-3.5">
          <span className="text-[13px] font-semibold">Why it is {approach.time}</span>
          <p className="text-sm leading-relaxed text-muted">{approach.complexityWhy}</p>
        </div>
      </section>
    </div>
  );
}

function CodeLines({ code, active }: { code: string; active: number[] }) {
  return (
    <pre className="overflow-x-auto py-3.5 font-mono text-sm leading-[1.9]">
      <code>
        {code.split("\n").map((line, i) => {
          const on = active.includes(i + 1);
          return (
            <div key={i} className={`flex min-h-[27px] whitespace-pre pr-4 ${on ? "bg-lime/10 shadow-[inset_3px_0_0_var(--color-lime)]" : ""}`}>
              <span className={`w-11 flex-none select-none pr-4 text-right ${on ? "text-lime" : "text-faint"}`}>{i + 1}</span>
              <span>
                {tokenizeLine(line).map((t, j) => (
                  <span key={j} className={TOKEN_CLASS[t.kind]}>{t.text}</span>
                ))}
              </span>
            </div>
          );
        })}
      </code>
    </pre>
  );
}

function Paywall({
  approach,
  unlockHref,
  signedIn,
  onWatchFree,
  problemId,
}: {
  approach: ApproachView;
  unlockHref: string;
  signedIn: boolean;
  onWatchFree: () => void;
  problemId: string;
}) {
  return (
    <section aria-label="Premium solution" className="flex flex-col items-center gap-6 rounded-2xl border border-[#3a3322] bg-surface px-8 py-10 text-center">
      <span className="flex size-16 items-center justify-center rounded-[20px] border border-amber/40 bg-amber/15 text-amber">
        <LockIcon size={28} />
      </span>
      <div className="flex max-w-xl flex-col items-center gap-2.5">
        <span className="text-xs font-bold uppercase tracking-[0.08em] text-amber">Premium · {KIND_LABEL[approach.kind]} solution</span>
        <h2 className="font-display text-3xl font-bold leading-tight tracking-tight">
          Watch “{approach.name}” bring this down to {approach.time}
        </h2>
        <p className="leading-relaxed text-muted">
          Every brute-force solution is free. Premium unlocks the optimized ones, with the full step-by-step dry run.
        </p>
      </div>
      <ul className="grid w-full max-w-xl grid-cols-1 gap-2.5 text-left sm:grid-cols-2">
        {[
          `${approach.stepCount}-step animated dry run`,
          "Code in Python, Java, C++, JS",
          `Why it runs in ${approach.time}`,
          "The key insight and interview follow-ups",
        ].map((t) => (
          <li key={t} className="flex items-center gap-2.5 rounded-xl bg-surface-2 px-3.5 py-3 text-sm">
            <span className="font-bold text-lime">✓</span>
            {t}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href={unlockHref} className={buttonPremium}>
          <LockIcon size={18} /> Unlock with Premium
        </Link>
        <button type="button" onClick={onWatchFree} className={buttonGhost}>
          Watch brute force free
        </button>
      </div>
      {!signedIn && (
        <p className="text-sm text-muted">
          Already a member?{" "}
          <Link href={`/login?next=${encodeURIComponent(`/problems/${problemId}`)}`} className="text-lime underline">
            Sign in with Google
          </Link>
        </p>
      )}
    </section>
  );
}
