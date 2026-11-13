"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { safeNext } from "@/lib/urls";
import { buttonGhost, buttonPremium, buttonPrimary } from "@/components/ui";

type Status = "checking" | "paid" | "failed" | "slow" | "error";
const POLL_MS = 2000;
const MAX_WAIT_MS = 60_000;

export function PaymentResult() {
  const params = useSearchParams();
  const router = useRouter();
  const orderId = params.get("order_id");
  const [status, setStatus] = useState<Status>(orderId ? "checking" : "error");
  const [periodEnd, setPeriodEnd] = useState<number | null>(null);
  const next = safeNext(params.get("next"));

  useEffect(() => {
    if (!orderId) return;
    let stopped = false;
    const started = Date.now();
    async function poll() {
      if (stopped) return;
      const res = await fetch(`/api/orders/${encodeURIComponent(orderId!)}`, { cache: "no-store" });
      if (!res.ok) {
        setStatus("error");
        return;
      }
      const data = await res.json();
      if (data.status === "paid") {
        setPeriodEnd(data.periodEnd);
        if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
          // Pick up the new Premium claim in the session cookie.
          const { refreshSession } = await import("@/lib/firebase/client");
          await refreshSession().catch(() => undefined);
        }
        setStatus("paid");
        router.refresh();
        return;
      }
      if (data.status === "failed" || data.status === "expired") {
        setStatus("failed");
        return;
      }
      if (Date.now() - started > MAX_WAIT_MS) {
        setStatus("slow");
        return;
      }
      setTimeout(poll, POLL_MS);
    }
    poll();
    return () => {
      stopped = true;
    };
  }, [orderId, router]);

  if (status === "checking") {
    return (
      <div className="flex flex-col items-center gap-5 text-center" role="status">
        <span className="pp-spin size-14 rounded-full border-4 border-line border-t-amber" aria-hidden="true" />
        <h1 className="font-display text-3xl font-bold">Confirming your payment</h1>
        <p className="text-muted">Please keep this tab open.</p>
      </div>
    );
  }

  if (status === "paid") {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <span className="flex size-20 items-center justify-center rounded-3xl bg-lime" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#0A0C11" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
        </span>
        <span className="text-xs font-bold uppercase tracking-[0.08em] text-amber">Payment received</span>
        <h1 className="font-display text-5xl font-bold tracking-[-0.035em]">Premium unlocked</h1>
        <p className="text-lg text-muted">
          Every optimized solution and its dry run is now open.
          {periodEnd && ` Premium runs until ${new Date(periodEnd).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}.`}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href={next} className={buttonPrimary}>Continue where you were</Link>
          <Link href="/patterns" className={buttonGhost}>Go to the pattern map</Link>
        </div>
      </div>
    );
  }

  if (status === "slow") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="font-display text-3xl font-bold">Still confirming</h1>
        <p className="text-muted">
          Your bank hasn&apos;t confirmed yet. If money was taken, Premium switches on as soon as the gateway tells
          us, usually within minutes. You can close this page.
        </p>
        <Link href={next} className={buttonGhost}>Back to learning</Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <h1 className="font-display text-4xl font-bold">Payment didn&apos;t go through</h1>
      <p className="text-muted">You haven&apos;t been charged. Try again, or use a different method.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href={`/checkout?next=${encodeURIComponent(next)}`} className={buttonPremium}>Try again</Link>
        <Link href={next} className={buttonGhost}>Back to learning</Link>
      </div>
    </div>
  );
}
