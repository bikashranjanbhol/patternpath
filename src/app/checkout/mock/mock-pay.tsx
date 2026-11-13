"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function MockPay() {
  const router = useRouter();
  const params = useSearchParams();
  const orderId = params.get("order_id") ?? "";
  const back = params.get("return");
  const returnPath =
    back && back.startsWith("/checkout/result?") ? back : `/checkout/result?order_id=${encodeURIComponent(orderId)}`;
  const [busy, setBusy] = useState(false);

  async function finish(outcome: "success" | "failure") {
    setBusy(true);
    await fetch("/api/payments/mock", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId, outcome }),
    });
    router.push(returnPath);
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-dashed border-amber/50 bg-surface p-8">
      <span className="text-xs font-bold uppercase tracking-[0.08em] text-amber">Test gateway</span>
      <h1 className="font-display text-2xl font-bold">Simulate a payment</h1>
      <p className="text-sm text-muted">
        PAYMENT_GATEWAY=mock. With Cashfree configured, its hosted checkout appears here instead.
      </p>
      <button type="button" disabled={busy} onClick={() => finish("success")} className="min-h-12 rounded-xl bg-lime font-semibold text-bg">
        Pay successfully
      </button>
      <button type="button" disabled={busy} onClick={() => finish("failure")} className="min-h-12 rounded-xl border border-coral/60 font-semibold text-coral">
        Fail the payment
      </button>
    </div>
  );
}
