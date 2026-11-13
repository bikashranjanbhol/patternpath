// Pure money and Premium-period logic. No I/O, so it is easy to unit test.
// Money is always whole paise (₹1 = 100 paise).

import type { Coupon, Plan } from "./types";

export const GST_RATE = 0.18;

export interface Quote {
  pricePaise: number;
  discountPaise: number;
  taxPaise: number;
  totalPaise: number;
  couponCode: string | null;
}

export type CouponProblem =
  | "not_found"
  | "inactive"
  | "expired"
  | "not_started"
  | "wrong_plan"
  | "used_up";

export function couponProblem(
  coupon: Coupon | null,
  planId: string,
  now: number,
): CouponProblem | null {
  if (!coupon) return "not_found";
  if (!coupon.active) return "inactive";
  if (now < coupon.validFrom) return "not_started";
  if (now > coupon.validUntil) return "expired";
  if (coupon.planIds.length > 0 && !coupon.planIds.includes(planId)) return "wrong_plan";
  if (coupon.usedCount >= coupon.maxUses) return "used_up";
  return null;
}

/** Price before tax, minus any coupon, plus GST on what is left. */
export function quote(plan: Plan, coupon: Coupon | null): Quote {
  const pricePaise = plan.pricePaise;
  const percent = coupon ? Math.min(Math.max(coupon.percentOff, 0), 100) : 0;
  const discountPaise = Math.round((pricePaise * percent) / 100);
  const taxable = pricePaise - discountPaise;
  const taxPaise = Math.round(taxable * GST_RATE);
  return {
    pricePaise,
    discountPaise,
    taxPaise,
    totalPaise: taxable + taxPaise,
    couponCode: coupon ? coupon.code : null,
  };
}

/** Adds whole calendar months in UTC, clamping to the month's last day. */
export function addMonths(ms: number, months: number): number {
  const d = new Date(ms);
  const day = d.getUTCDate();
  const target = new Date(
    Date.UTC(
      d.getUTCFullYear(),
      d.getUTCMonth() + months,
      1,
      d.getUTCHours(),
      d.getUTCMinutes(),
      d.getUTCSeconds(),
      d.getUTCMilliseconds(),
    ),
  );
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target.getTime();
}

/**
 * The Premium period a new payment buys. It starts at the later of now and
 * the current end date, so buying early never loses days.
 */
export function premiumPeriod(
  now: number,
  currentUntil: number | null,
  months: number,
): { start: number; end: number } {
  const start = currentUntil && currentUntil > now ? currentUntil : now;
  return { start, end: addMonths(start, months) };
}

export function isPremiumActive(premiumUntil: number | null, now: number): boolean {
  return premiumUntil !== null && premiumUntil > now;
}

export function formatRupees(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: rupees % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

/** Indian mobile number: 10 digits, optionally with +91 or 0 in front. */
export function normalizeIndianPhone(input: string): string | null {
  const digits = input.replace(/[\s-]/g, "");
  const m = digits.match(/^(?:\+91|91|0)?([6-9]\d{9})$/);
  return m ? m[1] : null;
}
