"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function MockPay() {
  const router = useRouter();
  const params = useSearchParams();
  const orderId = params.get("order_id") ?? "";
  const back = params.get("return") ?? "";
  // Keep the "next" path from the gateway return URL.
  const next = back.startsWith("/checkout/result?")
    ? new URLSearchParams(back.split("?")[1]).get("next")
    : null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function finish(outcome: "success" | "failure") {
    setBusy(true);
    const res = await fetch("/api/payments/mock", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId, outcome }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      setError("This test order has expired. Start checkout again.");
      return;
    }
    const q = new URLSearchParams({ order_id: data.orderId });
    if (next) q.set("next", next);
    router.push(`/checkout/result?${q}`);
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
      {error && <p role="alert" className="text-sm text-coral">{error}</p>}
      <button type="button" disabled={busy} onClick={() => finish("failure")} className="min-h-12 rounded-xl border border-coral/60 font-semibold text-coral">
        Fail the payment
      </button>
    </div>
  );
}
