import "server-only";
import fs from "node:fs";
import path from "node:path";
import * as seed from "@/content/seed";
import { readJson, signJson } from "@/lib/dev-token";
import type { Order, Problem, Solution, UserRecord } from "@/lib/types";
import { applyFulfillment, FulfillError } from "./fulfill";
import {
  ContentReadOnlyError,
  summarize,
  type AccountStore,
  type ContentAdmin,
  type ContentStore,
  type FulfillResult,
  type NewOrder,
  type NewUser,
  type PaymentInfo,
} from "./store";

// Development/demo store: content comes from src/content/seed.ts. Users and
// orders are cached in memory, but each order is also a signed snapshot in its
// own ID ("lo_…"), so the demo checkout works on serverless hosts where memory
// is not shared. Paying produces a new snapshot ID with status "paid".

const clone = <T>(x: T): T => structuredClone(x);

// ---- Content: seed + files written by the authoring tool --------------------

const AUTHORED_DIR = path.join(process.cwd(), "content", "authored");

interface AuthoredFile {
  problem: Problem;
  solutions: Solution[];
}

function readAuthored(): AuthoredFile[] {
  if (!fs.existsSync(AUTHORED_DIR)) return [];
  return fs
    .readdirSync(AUTHORED_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(AUTHORED_DIR, f), "utf8")) as AuthoredFile);
}

/** Seed content with authored files layered on top (same ID = authored wins). */
function allContent() {
  const problems = new Map(seed.problems.map((p) => [p.id, p]));
  const solutions = new Map<string, Solution[]>();
  for (const s of seed.solutions) solutions.set(s.problemId, [...(solutions.get(s.problemId) ?? []), s]);
  for (const a of readAuthored()) {
    problems.set(a.problem.id, a.problem);
    solutions.set(a.problem.id, a.solutions);
  }
  return { problems: [...problems.values()], solutions };
}

function writeAuthored(file: AuthoredFile) {
  if (process.env.VERCEL) {
    throw new ContentReadOnlyError(
      "This deployment can't save files. Run the app locally (npm run dev) to author content, or connect Firebase.",
    );
  }
  fs.mkdirSync(AUTHORED_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(AUTHORED_DIR, `${file.problem.id}.json`),
    JSON.stringify(file, null, 2) + "\n",
  );
}

export class LocalContentStore implements ContentStore, ContentAdmin {
  async listPatterns() {
    const { problems } = allContent();
    return clone(
      seed.patterns
        .filter((p) => p.published)
        .sort((a, b) => a.order - b.order)
        .map((p) => ({
          ...p,
          problemCount: problems.filter((q) => q.published && q.primaryPatternId === p.id).length,
        })),
    );
  }
  async getPattern(id: string) {
    return (await this.listPatterns()).find((p) => p.id === id) ?? null;
  }
  async listProblemsByPattern(patternId: string) {
    return clone(
      allContent()
        .problems.filter((p) => p.published && p.primaryPatternId === patternId)
        .sort((a, b) => a.ladderOrder - b.ladderOrder),
    );
  }
  async getProblem(id: string) {
    return clone(allContent().problems.find((p) => p.id === id && p.published) ?? null);
  }
  async listSolutions(problemId: string) {
    return clone([...(allContent().solutions.get(problemId) ?? [])].sort((a, b) => a.order - b.order));
  }
  async getConcept(id: string) {
    return clone(seed.concepts.find((c) => c.id === id && c.published) ?? null);
  }
  async listConceptIds() {
    return seed.concepts.filter((c) => c.published).map((c) => c.id);
  }
  async listProblemIds() {
    return allContent().problems.filter((p) => p.published).map((p) => p.id);
  }
  async listPlans() {
    return clone(seed.plans.filter((p) => p.active).sort((a, b) => a.order - b.order));
  }

  // -- admin --
  async listAllProblems() {
    return clone(allContent().problems.sort((a, b) => b.number - a.number));
  }
  async getProblemAny(id: string) {
    return clone(allContent().problems.find((p) => p.id === id) ?? null);
  }
  async listConcepts() {
    return seed.concepts.map((c) => ({ id: c.id, title: c.title }));
  }
  async saveProblem(problem: Problem) {
    const solutions = await this.listSolutions(problem.id);
    writeAuthored({ problem: { ...problem, solutionSummaries: summarize(solutions) }, solutions });
  }
  async saveSolution(solution: Solution) {
    const problem = await this.getProblemAny(solution.problemId);
    if (!problem) throw new Error("Problem not found");
    const solutions = [
      ...(await this.listSolutions(problem.id)).filter((s) => s.id !== solution.id),
      solution,
    ].sort((a, b) => a.order - b.order);
    writeAuthored({ problem: { ...problem, solutionSummaries: summarize(solutions) }, solutions });
  }
  async deleteSolution(problemId: string, solutionId: string) {
    const problem = await this.getProblemAny(problemId);
    if (!problem) return;
    const solutions = (await this.listSolutions(problemId)).filter((s) => s.id !== solutionId);
    writeAuthored({ problem: { ...problem, solutionSummaries: summarize(solutions) }, solutions });
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
