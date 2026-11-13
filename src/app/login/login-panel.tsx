"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { safeNext } from "@/lib/urls";

export function LoginPanel({ localMode }: { localMode: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const [state, setState] = useState<"idle" | "waiting" | "error">("idle");
  const [error, setError] = useState("");

  async function google() {
    setState("waiting");
    try {
      const { signInWithGoogle } = await import("@/lib/firebase/client");
      await signInWithGoogle();
      router.replace(next);
      router.refresh();
    } catch (e) {
      const code = (e as { code?: string }).code ?? (e as Error).message;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
        setState("idle");
        return;
      }
      setError("Sign-in didn't finish. Please try again.");
      setState("error");
    }
  }

  async function dev(premium: boolean) {
    setState("waiting");
    const res = await fetch("/api/dev/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ premium }),
    });
    if (!res.ok) {
      setError("Dev sign-in failed.");
      setState("error");
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      {next.startsWith("/problems/") && (
        <p className="rounded-xl border border-amber/35 bg-amber/10 px-4 py-3 text-sm text-[#f5d38b]">
          Sign in to continue to the solution you were viewing.
        </p>
      )}
      <div className="flex flex-col gap-2">
        <h2 className="font-display text-3xl font-bold tracking-tight">Welcome</h2>
        <p className="text-muted">Sign in or create your free account.</p>
      </div>

      {state === "waiting" ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-line bg-surface p-8 text-center" role="status">
          <span className="pp-spin size-11 rounded-full border-[3px] border-line border-t-lime" aria-hidden="true" />
          <span className="font-semibold">Finish signing in with Google</span>
          <span className="text-sm text-muted">Pick your account in the Google window.</span>
        </div>
      ) : localMode ? (
        <div className="flex flex-col gap-3">
          <p className="rounded-xl border border-dashed border-line-2 p-3 text-sm text-muted">
            Local mode: Google sign-in is replaced by a test account.
          </p>
          <button type="button" onClick={() => dev(false)} className="min-h-14 rounded-2xl bg-ink font-semibold text-bg">
            Dev sign-in (Free)
          </button>
          <button type="button" onClick={() => dev(true)} className="min-h-14 rounded-2xl border border-amber/50 font-semibold text-amber">
            Dev sign-in (Premium)
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={google}
          className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-[#dadce0] bg-white font-medium text-[#1f1f1f]"
        >
          <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Continue with Google
        </button>
      )}

      {state === "error" && <p role="alert" className="text-sm text-coral">{error}</p>}

      <p className="text-[13px] leading-relaxed text-dim">
        By continuing you agree to the Terms and Privacy Policy. From Google we only receive your name, email
        address and profile photo.
      </p>
    </div>
  );
}
