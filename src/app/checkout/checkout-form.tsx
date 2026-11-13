"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatRupees, normalizeIndianPhone, quote as localQuote, type Quote } from "@/lib/pricing";
import type { Plan } from "@/lib/types";
import { LockIcon } from "@/components/ui";

const PER: Record<string, string> = { monthly: "/ month", sprint: "/ 3 months", yearly: "/ year" };
const COUPON_ERRORS: Record<string, string> = {
  not_found: "That code doesn't exist.",
  inactive: "That code is no longer active.",
  expired: "That code has expired.",
  not_started: "That code isn't active yet.",
  wrong_plan: "That code doesn't apply to this plan.",
  used_up: "That code has been fully used.",
  already_used: "You've already used this code.",
};

interface Props {
  plans: Plan[];
  initialPlanId?: string;
  next: string;
  email: string;
  gatewayMode: "sandbox" | "production";
}

export function CheckoutForm({ plans, initialPlanId, next, email, gatewayMode }: Props) {
  const router = useRouter();
  const [planId, setPlanId] = useState(initialPlanId ?? plans[0]?.id);
  const [phone, setPhone] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; planId: string; quote: Quote } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const plan = plans.find((p) => p.id === planId)!;
  const q = coupon && coupon.planId === planId ? coupon.quote : localQuote(plan, null);

  async function post(body: object) {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  }

  async function applyCoupon(code = couponInput, forPlan = planId) {
    setError("");
    if (!code.trim()) return;
    const { ok, data } = await post({ planId: forPlan, phone: "", couponCode: code, quoteOnly: true });
    if (!ok) {
      setCoupon(null);
      setError(COUPON_ERRORS[data.reason] ?? "Couldn't apply that code.");
      return;
    }
    setCoupon({ code: code.trim().toUpperCase(), planId: forPlan, quote: data.quote });
  }

  function choosePlan(id: Plan["id"]) {
    setPlanId(id);
    if (coupon) void applyCoupon(coupon.code, id);
  }

  async function pay() {
    setError("");
    if (!normalizeIndianPhone(phone)) {
      setError("Enter a 10-digit Indian mobile number. The payment gateway needs it.");
      return;
    }
    setBusy(true);
    const { ok, data } = await post({ planId, phone, couponCode: coupon?.code ?? null, next });
    if (!ok) {
      setBusy(false);
      setError(
        data.error === "phone"
          ? "Enter a 10-digit Indian mobile number."
          : data.error === "coupon"
            ? (COUPON_ERRORS[data.reason] ?? "That coupon can't be used.")
            : "We couldn't start the payment. Please try again.",
      );
      return;
    }
    if (data.gateway === "mock") {
      router.push(data.paymentSessionId);
      return;
    }
    const { load } = await import("@cashfreepayments/cashfree-js");
    const cashfree = await load({ mode: data.mode === "production" ? "production" : "sandbox" });
    await cashfree.checkout({ paymentSessionId: data.paymentSessionId, redirectTarget: "_self" });
  }

  return (
    <div className="flex flex-wrap items-start gap-7">
      <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-5">
        <Link href={`/pricing?next=${encodeURIComponent(next)}`} className="self-start text-sm text-muted hover:text-ink">← Back to plans</Link>
        <h1 className="font-display text-4xl font-bold tracking-[-0.03em]">Complete your upgrade</h1>

        <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
          <h2 className="font-semibold">1 · Choose your plan</h2>
          <div role="radiogroup" aria-label="Plan" className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-2.5">
            {plans.map((p) => {
              const on = p.id === planId;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => choosePlan(p.id)}
                  className={`flex flex-col items-start gap-2 rounded-xl border-[1.5px] p-4 text-left ${on ? "border-amber bg-[#161410]" : "border-line bg-bg-2"}`}
                >
                  <span className={`size-[18px] rounded-full ${on ? "border-[5px] border-amber" : "border-2 border-[#3a4254]"}`} />
                  <span className="font-semibold">{p.name}</span>
                  <span className="font-mono text-[13px] text-muted">{formatRupees(p.pricePaise)} {PER[p.id]}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-6">
          <h2 className="font-semibold">2 · Your details</h2>
          <label className="flex flex-col gap-2 text-sm font-medium">
            Mobile number
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="98765 43210"
              className="h-12 rounded-xl border border-line-2 bg-bg px-3.5 font-mono text-[15px] text-ink"
            />
            <span className="text-xs font-normal text-dim">The payment gateway requires it. We don&apos;t use it for anything else.</span>
          </label>
          <p className="text-sm text-muted">Receipt goes to <span className="text-ink">{email}</span>. You&apos;ll choose UPI, card or net banking on the next screen.</p>
        </section>
      </div>

      <aside aria-label="Order summary" className="flex min-w-0 flex-[1_1_340px] flex-col gap-5 rounded-3xl border-[1.5px] border-amber bg-[#161410] p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Order summary</h2>
          <span className="rounded-full bg-amber px-2.5 py-1 text-xs font-bold text-bg">Premium</span>
        </div>
        <span className="text-lg font-semibold">{plan.name}</span>

        <div className="flex flex-col gap-2 border-t border-[#2e2a1e] pt-4">
          <label htmlFor="coupon" className="text-sm font-medium">Coupon code</label>
          <div className="flex gap-2">
            <input
              id="coupon"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              placeholder="e.g. STUDENT"
              className="h-11 min-w-0 flex-1 rounded-lg border border-line-2 bg-bg px-3 font-mono text-sm uppercase text-ink"
            />
            <button type="button" onClick={() => applyCoupon()} className="h-11 rounded-lg border border-line-2 bg-surface-2 px-4 text-sm">
              Apply
            </button>
          </div>
          {coupon && coupon.planId === planId && (
            <span className="text-[13px] text-lime">✓ {coupon.code} applied</span>
          )}
        </div>

        <dl className="flex flex-col gap-2.5 border-t border-[#2e2a1e] pt-4 text-sm">
          <div className="flex justify-between"><dt className="text-muted">{plan.name}</dt><dd className="font-mono">{formatRupees(q.pricePaise)}</dd></div>
          {q.discountPaise > 0 && (
            <div className="flex justify-between"><dt className="text-muted">Coupon {q.couponCode}</dt><dd className="font-mono text-lime">− {formatRupees(q.discountPaise)}</dd></div>
          )}
          <div className="flex justify-between"><dt className="text-muted">GST (18%)</dt><dd className="font-mono">{formatRupees(q.taxPaise)}</dd></div>
          <div className="flex items-baseline justify-between border-t border-dashed border-[#3a3322] pt-3">
            <dt className="font-semibold">Due today</dt>
            <dd className="font-display text-3xl font-bold">{formatRupees(q.totalPaise)}</dd>
          </div>
        </dl>

        {error && <p role="alert" className="text-sm text-coral">{error}</p>}

        <button
          type="button"
          onClick={pay}
          disabled={busy}
          className="flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-amber text-[17px] font-semibold text-bg disabled:opacity-60"
        >
          <LockIcon size={18} /> {busy ? "Opening secure checkout…" : `Pay ${formatRupees(q.totalPaise)}`}
        </button>
        <p className="text-xs leading-relaxed text-dim">
          One-time payment for {plan.months} {plan.months === 1 ? "month" : "months"} of Premium. No auto-debit; we&apos;ll remind you before it ends.
          {gatewayMode === "sandbox" && " (Test mode: no real money is charged.)"}
        </p>
      </aside>
    </div>
  );
}
