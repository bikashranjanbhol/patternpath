import { describe, expect, it } from "vitest";
import { applyFulfillment, FulfillError } from "@/lib/data/fulfill";
import {
  cashfreeSignature,
  parseCashfreeWebhook,
  WebhookSignatureError,
} from "@/lib/payments/cashfree-webhook";
import type { Order, Plan, UserRecord } from "@/lib/types";
import { safeNext } from "@/lib/urls";

const SECRET = "test_secret";

function webhook(body: object, secret = SECRET) {
  const raw = JSON.stringify(body);
  const ts = "1731480000000";
  const headers = new Headers({
    "x-webhook-timestamp": ts,
    "x-webhook-signature": cashfreeSignature(ts, raw, secret),
  });
  return { raw, headers };
}

const success = {
  type: "PAYMENT_SUCCESS_WEBHOOK",
  data: {
    order: { order_id: "ord_1", order_amount: 588.82 },
    payment: { cf_payment_id: 12345, payment_status: "SUCCESS", payment_amount: 588.82, payment_group: "upi" },
  },
};

describe("Cashfree webhook", () => {
  it("accepts a correctly signed success event", () => {
    const { raw, headers } = webhook(success);
    const e = parseCashfreeWebhook(raw, headers, SECRET);
    expect(e).toMatchObject({
      type: "payment_success",
      orderId: "ord_1",
      gatewayPaymentId: "12345",
      method: "upi",
      amountPaise: 58882,
    });
    expect(e.key).toContain("ord_1");
  });

  it("rejects a bad signature", () => {
    const { raw, headers } = webhook(success, "other_secret");
    expect(() => parseCashfreeWebhook(raw, headers, SECRET)).toThrow(WebhookSignatureError);
  });

  it("rejects a tampered body", () => {
    const { headers } = webhook(success);
    const tampered = JSON.stringify({ ...success, data: { ...success.data, order: { order_id: "ord_2" } } });
    expect(() => parseCashfreeWebhook(tampered, headers, SECRET)).toThrow(WebhookSignatureError);
  });

  it("treats failures and unknown events correctly", () => {
    const failed = webhook({ ...success, type: "PAYMENT_FAILED_WEBHOOK", data: { ...success.data, payment: { ...success.data.payment, payment_status: "FAILED" } } });
    expect(parseCashfreeWebhook(failed.raw, failed.headers, SECRET).type).toBe("payment_failed");
    const other = webhook({ type: "PAYMENT_USER_DROPPED_WEBHOOK", data: success.data });
    expect(parseCashfreeWebhook(other.raw, other.headers, SECRET).type).toBe("other");
  });
});

const plan: Plan = { id: "monthly", name: "Monthly", months: 1, pricePaise: 19900, perks: [], active: true, order: 1 };
const user: UserRecord = {
  uid: "u1",
  name: "A",
  email: "a@example.com",
  photoUrl: null,
  role: "user",
  plan: { tier: "free", planId: null, premiumUntil: null, lastOrderId: null },
  createdAt: 0,
};
const order: Order = {
  id: "ord_1",
  uid: "u1",
  planId: "monthly",
  pricePaise: 19900,
  discountPaise: 0,
  taxPaise: 3582,
  totalPaise: 23482,
  currency: "INR",
  couponCode: null,
  status: "created",
  gateway: "cashfree",
  gatewayOrderId: "ord_1",
  gatewayPaymentId: null,
  method: null,
  phone: "9876543210",
  periodStart: null,
  periodEnd: null,
  createdAt: 0,
  paidAt: null,
};
const now = Date.UTC(2026, 10, 13);

describe("applyFulfillment", () => {
  it("marks the order paid and grants Premium", () => {
    const r = applyFulfillment(order, user, plan, { gatewayPaymentId: "p1", method: "upi" }, now);
    expect(r.changed).toBe(true);
    expect(r.order.status).toBe("paid");
    expect(r.order.periodStart).toBe(now);
    expect(r.user.plan.tier).toBe("premium");
    expect(r.user.plan.premiumUntil).toBe(r.order.periodEnd);
  });

  it("is idempotent: a paid order changes nothing", () => {
    const first = applyFulfillment(order, user, plan, { gatewayPaymentId: "p1", method: "upi" }, now);
    const again = applyFulfillment(first.order, first.user, plan, { gatewayPaymentId: "p1", method: "upi" }, now + 5000);
    expect(again.changed).toBe(false);
    expect(again.user.plan.premiumUntil).toBe(first.user.plan.premiumUntil);
  });

  it("refuses another user's or a refunded order", () => {
    expect(() => applyFulfillment(order, { ...user, uid: "u2" }, plan, { gatewayPaymentId: null, method: null }, now)).toThrow(FulfillError);
    expect(() => applyFulfillment({ ...order, status: "refunded" }, user, plan, { gatewayPaymentId: null, method: null }, now)).toThrow(FulfillError);
  });
});

describe("safeNext", () => {
  it("keeps same-site paths and drops anything else", () => {
    expect(safeNext("/problems/567")).toBe("/problems/567");
    expect(safeNext("https://evil.example")).toBe("/patterns");
    expect(safeNext("//evil.example")).toBe("/patterns");
    expect(safeNext("/\\evil.example")).toBe("/patterns");
    expect(safeNext(null)).toBe("/patterns");
  });
});
