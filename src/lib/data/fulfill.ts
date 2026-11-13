// Pure rules for turning a paid order into Premium time. Both stores call this
// inside their own transaction so the behaviour is identical and testable.

import { premiumPeriod } from "@/lib/pricing";
import type { Order, Plan, UserRecord } from "@/lib/types";
import type { PaymentInfo } from "./store";

export class FulfillError extends Error {}

export function applyFulfillment(
  order: Order,
  user: UserRecord,
  plan: Plan,
  payment: PaymentInfo,
  now: number,
): { order: Order; user: UserRecord; changed: boolean } {
  if (order.status === "paid") return { order, user, changed: false };
  if (order.status === "refunded") throw new FulfillError("Order was refunded");
  if (order.uid !== user.uid) throw new FulfillError("Order belongs to another user");
  if (order.planId !== plan.id) throw new FulfillError("Order plan mismatch");

  const { start, end } = premiumPeriod(now, user.plan.premiumUntil, plan.months);
  const paidOrder: Order = {
    ...order,
    status: "paid",
    gatewayPaymentId: payment.gatewayPaymentId ?? order.gatewayPaymentId,
    method: payment.method ?? order.method,
    periodStart: start,
    periodEnd: end,
    paidAt: now,
  };
  const updatedUser: UserRecord = {
    ...user,
    plan: { tier: "premium", planId: plan.id, premiumUntil: end, lastOrderId: order.id },
  };
  return { order: paidOrder, user: updatedUser, changed: true };
}
