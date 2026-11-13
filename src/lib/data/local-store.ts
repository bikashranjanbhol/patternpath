import "server-only";
import * as seed from "@/content/seed";
import type { Order, UserRecord } from "@/lib/types";
import { applyFulfillment, FulfillError } from "./fulfill";
import type {
  AccountStore,
  ContentStore,
  FulfillResult,
  NewOrder,
  NewUser,
  PaymentInfo,
} from "./store";

// Development-only store: content comes from src/content/seed.ts and accounts
// live in memory (lost on restart). Kept on globalThis so hot reload keeps it.

const clone = <T>(x: T): T => structuredClone(x);

export class LocalContentStore implements ContentStore {
  async listPatterns() {
    return clone(seed.patterns.filter((p) => p.published).sort((a, b) => a.order - b.order));
  }
  async getPattern(id: string) {
    return clone(seed.patterns.find((p) => p.id === id && p.published) ?? null);
  }
  async listProblemsByPattern(patternId: string) {
    return clone(
      seed.problems
        .filter((p) => p.published && p.primaryPatternId === patternId)
        .sort((a, b) => a.ladderOrder - b.ladderOrder),
    );
  }
  async getProblem(id: string) {
    return clone(seed.problems.find((p) => p.id === id && p.published) ?? null);
  }
  async listSolutions(problemId: string) {
    return clone(
      seed.solutions.filter((s) => s.problemId === problemId).sort((a, b) => a.order - b.order),
    );
  }
  async getConcept(id: string) {
    return clone(seed.concepts.find((c) => c.id === id && c.published) ?? null);
  }
  async listConceptIds() {
    return seed.concepts.filter((c) => c.published).map((c) => c.id);
  }
  async listProblemIds() {
    return seed.problems.filter((p) => p.published).map((p) => p.id);
  }
  async listPlans() {
    return clone(seed.plans.filter((p) => p.active).sort((a, b) => a.order - b.order));
  }
}

interface Memory {
  users: Map<string, UserRecord>;
  orders: Map<string, Order>;
  events: Set<string>;
  couponUses: Map<string, number>;
  redemptions: Set<string>;
  seq: number;
}

const g = globalThis as unknown as { __ppMemory?: Memory };
const mem: Memory = (g.__ppMemory ??= {
  users: new Map(),
  orders: new Map(),
  events: new Set(),
  couponUses: new Map(),
  redemptions: new Set(),
  seq: 0,
});

export class LocalAccountStore implements AccountStore {
  async getUser(uid: string) {
    return clone(mem.users.get(uid) ?? null);
  }

  async ensureUser(u: NewUser) {
    const existing = mem.users.get(u.uid);
    if (existing) return clone(existing);
    const user: UserRecord = {
      ...u,
      role: "user",
      plan: { tier: "free", planId: null, premiumUntil: null, lastOrderId: null },
      createdAt: Date.now(),
    };
    mem.users.set(u.uid, user);
    return clone(user);
  }

  /** Dev helper: give or remove Premium without paying. */
  async setPremiumUntil(uid: string, premiumUntil: number | null) {
    const user = mem.users.get(uid);
    if (!user) return;
    user.plan = {
      ...user.plan,
      tier: premiumUntil ? "premium" : "free",
      premiumUntil,
    };
  }

  async getPlan(id: string) {
    return clone(seed.plans.find((p) => p.id === id && p.active) ?? null);
  }

  async getCoupon(code: string) {
    const c = seed.coupons.find((x) => x.code === code.toUpperCase());
    if (!c) return null;
    return { ...clone(c), usedCount: c.usedCount + (mem.couponUses.get(c.code) ?? 0) };
  }

  async hasRedeemedCoupon(code: string, uid: string) {
    return mem.redemptions.has(`${code.toUpperCase()}:${uid}`);
  }

  async createOrder(o: NewOrder) {
    mem.seq += 1;
    const order: Order = { ...o, id: `local_${Date.now()}_${mem.seq}` };
    mem.orders.set(order.id, order);
    return clone(order);
  }

  async getOrder(id: string) {
    return clone(mem.orders.get(id) ?? null);
  }

  async setGatewayOrderId(id: string, gatewayOrderId: string) {
    const o = mem.orders.get(id);
    if (o) o.gatewayOrderId = gatewayOrderId;
  }

  async markOrderFailed(id: string) {
    const o = mem.orders.get(id);
    if (o && o.status === "created") o.status = "failed";
  }

  async fulfillOrder(orderId: string, payment: PaymentInfo, now: number): Promise<FulfillResult> {
    const order = mem.orders.get(orderId);
    if (!order) throw new FulfillError("Order not found");
    const user = mem.users.get(order.uid);
    if (!user) throw new FulfillError("User not found");
    const plan = seed.plans.find((p) => p.id === order.planId);
    if (!plan) throw new FulfillError("Plan not found");
    const result = applyFulfillment(order, user, plan, payment, now);
    if (result.changed) {
      mem.orders.set(orderId, result.order);
      mem.users.set(user.uid, result.user);
      if (order.couponCode) {
        mem.couponUses.set(order.couponCode, (mem.couponUses.get(order.couponCode) ?? 0) + 1);
        mem.redemptions.add(`${order.couponCode}:${order.uid}`);
      }
    }
    return clone(result);
  }

  async recordPaymentEvent(key: string) {
    if (mem.events.has(key)) return false;
    mem.events.add(key);
    return true;
  }
}
