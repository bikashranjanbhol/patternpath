import "server-only";
import * as seed from "@/content/seed";
import { readJson, signJson } from "@/lib/dev-token";
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

// Development/demo store: content comes from src/content/seed.ts. Users and
// orders are cached in memory, but each order is also a signed snapshot in its
// own ID ("lo_…"), so the demo checkout works on serverless hosts where memory
// is not shared. Paying produces a new snapshot ID with status "paid".

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
}

const g = globalThis as unknown as { __ppMemory?: Memory };
const mem: Memory = (g.__ppMemory ??= {
  users: new Map(),
  orders: new Map(),
  events: new Set(),
  couponUses: new Map(),
  redemptions: new Set(),
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

  /** Stores an order snapshot and returns it with its new signed ID. */
  snapshot(o: NewOrder | Order): Order {
    const { id: _old, ...data } = o as Order;
    void _old;
    const order: Order = { ...data, id: `lo_${signJson(data)}` };
    mem.orders.set(order.id, order);
    return clone(order);
  }

  async createOrder(o: NewOrder) {
    return this.snapshot(o);
  }

  async getOrder(id: string) {
    const cached = mem.orders.get(id);
    if (cached) return clone(cached);
    if (!id.startsWith("lo_")) return null;
    const data = readJson<NewOrder>(id.slice(3));
    return data ? { ...data, id } : null;
  }

  async setGatewayOrderId(id: string, gatewayOrderId: string) {
    const o = mem.orders.get(id);
    if (o) o.gatewayOrderId = gatewayOrderId;
  }

  async markOrderFailed(id: string) {
    const o = await this.getOrder(id);
    if (o && o.status === "created") mem.orders.set(id, this.snapshot({ ...o, status: "failed" }));
  }

  async fulfillOrder(orderId: string, payment: PaymentInfo, now: number): Promise<FulfillResult> {
    const order = await this.getOrder(orderId);
    if (!order) throw new FulfillError("Order not found");
    const user =
      mem.users.get(order.uid) ??
      (await this.ensureUser({ uid: order.uid, name: "Dev Learner", email: "", photoUrl: null }));
    const plan = seed.plans.find((p) => p.id === order.planId);
    if (!plan) throw new FulfillError("Plan not found");
    const result = applyFulfillment(order, user, plan, payment, now);
    if (result.changed) {
      result.order = this.snapshot(result.order);
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
