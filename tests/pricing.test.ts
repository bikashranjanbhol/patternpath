import { describe, expect, it } from "vitest";
import {
  addMonths,
  couponProblem,
  isPremiumActive,
  normalizeIndianPhone,
  premiumPeriod,
  quote,
} from "@/lib/pricing";
import type { Coupon, Plan } from "@/lib/types";

const plan: Plan = { id: "sprint", name: "Sprint", months: 3, pricePaise: 49900, perks: [], active: true, order: 2 };
const coupon: Coupon = {
  code: "STUDENT",
  percentOff: 20,
  planIds: [],
  maxUses: 10,
  usedCount: 0,
  validFrom: Date.UTC(2026, 0, 1),
  validUntil: Date.UTC(2026, 11, 31),
  active: true,
};
const now = Date.UTC(2026, 10, 13);

describe("quote", () => {
  it("adds 18% GST to the plan price", () => {
    expect(quote(plan, null)).toEqual({
      pricePaise: 49900,
      discountPaise: 0,
      taxPaise: 8982,
      totalPaise: 58882,
      couponCode: null,
    });
  });

  it("applies the coupon before GST", () => {
    const q = quote(plan, coupon);
    expect(q.discountPaise).toBe(9980);
    expect(q.taxPaise).toBe(Math.round((49900 - 9980) * 0.18));
    expect(q.totalPaise).toBe(49900 - 9980 + q.taxPaise);
    expect(q.couponCode).toBe("STUDENT");
  });
});

describe("couponProblem", () => {
  it("accepts a valid coupon", () => expect(couponProblem(coupon, "sprint", now)).toBeNull());
  it("rejects missing, expired, used up and wrong-plan coupons", () => {
    expect(couponProblem(null, "sprint", now)).toBe("not_found");
    expect(couponProblem({ ...coupon, validUntil: now - 1 }, "sprint", now)).toBe("expired");
    expect(couponProblem({ ...coupon, usedCount: 10 }, "sprint", now)).toBe("used_up");
    expect(couponProblem({ ...coupon, planIds: ["yearly"] }, "sprint", now)).toBe("wrong_plan");
    expect(couponProblem({ ...coupon, active: false }, "sprint", now)).toBe("inactive");
  });
});

describe("premium periods", () => {
  it("adds calendar months and clamps to the last day", () => {
    expect(new Date(addMonths(Date.UTC(2026, 0, 31), 1)).toISOString().slice(0, 10)).toBe("2026-02-28");
    expect(new Date(addMonths(Date.UTC(2026, 10, 13), 3)).toISOString().slice(0, 10)).toBe("2027-02-13");
  });

  it("starts now when there is no active Premium", () => {
    expect(premiumPeriod(now, null, 1).start).toBe(now);
    expect(premiumPeriod(now, now - 1000, 1).start).toBe(now);
  });

  it("extends from the current end date when bought early", () => {
    const until = Date.UTC(2026, 11, 1);
    const p = premiumPeriod(now, until, 1);
    expect(p.start).toBe(until);
    expect(new Date(p.end).toISOString().slice(0, 10)).toBe("2027-01-01");
  });

  it("knows when Premium is active", () => {
    expect(isPremiumActive(null, now)).toBe(false);
    expect(isPremiumActive(now + 1, now)).toBe(true);
    expect(isPremiumActive(now, now)).toBe(false);
  });
});

describe("normalizeIndianPhone", () => {
  it("accepts common formats", () => {
    expect(normalizeIndianPhone("98765 43210")).toBe("9876543210");
    expect(normalizeIndianPhone("+91 98765-43210")).toBe("9876543210");
    expect(normalizeIndianPhone("09876543210")).toBe("9876543210");
  });
  it("rejects invalid numbers", () => {
    expect(normalizeIndianPhone("12345")).toBeNull();
    expect(normalizeIndianPhone("5876543210")).toBeNull();
  });
});
