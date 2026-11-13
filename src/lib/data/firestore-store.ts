import "server-only";
import { FieldValue, Timestamp, type DocumentData } from "firebase-admin/firestore";
import { db } from "@/lib/firebase/admin";
import type {
  Concept,
  Coupon,
  Order,
  Pattern,
  Plan,
  Problem,
  Solution,
  UserRecord,
} from "@/lib/types";
import { applyFulfillment, FulfillError } from "./fulfill";
import {
  summarize,
  type AccountStore,
  type ContentAdmin,
  type ContentStore,
  type FulfillResult,
  type NewOrder,
  type NewUser,
  type PaymentInfo,
} from "./store";

// Firestore implementation. Collection and field names follow the
// "PatternPath — Database Design (Firestore)" doc. Times are stored as
// Firestore Timestamps and returned as epoch milliseconds.

const ms = (v: unknown): number | null =>
  v instanceof Timestamp ? v.toMillis() : typeof v === "number" ? v : null;
const ts = (v: number | null) => (v === null ? null : Timestamp.fromMillis(v));

function withId<T>(id: string, data: DocumentData | undefined): T | null {
  return data ? ({ ...data, id } as T) : null;
}

function stripTimes<T extends Record<string, unknown>>(data: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(data)) out[k] = val instanceof Timestamp ? val.toMillis() : val;
  return out as T;
}

export class FirestoreContentStore implements ContentStore, ContentAdmin {
  async listPatterns() {
    const snap = await db()
      .collection("patterns")
      .where("published", "==", true)
      .orderBy("order")
      .get();
    return snap.docs.map((d) => withId<Pattern>(d.id, stripTimes(d.data()))!);
  }

  async getPattern(id: string) {
    const d = await db().collection("patterns").doc(id).get();
    const p = withId<Pattern>(d.id, d.exists ? stripTimes(d.data()!) : undefined);
    return p && p.published ? p : null;
  }

  async listProblemsByPattern(patternId: string) {
    const snap = await db()
      .collection("problems")
      .where("primaryPatternId", "==", patternId)
      .where("published", "==", true)
      .orderBy("ladderOrder")
      .get();
    return snap.docs.map((d) => withId<Problem>(d.id, stripTimes(d.data()))!);
  }

  async getProblem(id: string) {
    const d = await db().collection("problems").doc(id).get();
    const p = withId<Problem>(d.id, d.exists ? stripTimes(d.data()!) : undefined);
    return p && p.published ? p : null;
  }

  async listSolutions(problemId: string) {
    const snap = await db()
      .collection("problems")
      .doc(problemId)
      .collection("solutions")
      .orderBy("order")
      .get();
    return snap.docs.map((d) => ({ ...stripTimes(d.data()), id: d.id, problemId }) as Solution);
  }

  async getConcept(id: string) {
    const d = await db().collection("concepts").doc(id).get();
    const c = withId<Concept>(d.id, d.exists ? stripTimes(d.data()!) : undefined);
    return c && c.published ? c : null;
  }

  async listConceptIds() {
    const snap = await db().collection("concepts").where("published", "==", true).select().get();
    return snap.docs.map((d) => d.id);
  }

  async listProblemIds() {
    const snap = await db().collection("problems").where("published", "==", true).select().get();
    return snap.docs.map((d) => d.id);
  }

  async listPlans() {
    const snap = await db().collection("plans").where("active", "==", true).get();
    return snap.docs
      .map((d) => withId<Plan>(d.id, d.data())!)
      .sort((a, b) => a.order - b.order);
  }

  // -- admin --
  async listAllProblems() {
    const snap = await db().collection("problems").orderBy("number", "desc").get();
    return snap.docs.map((d) => withId<Problem>(d.id, stripTimes(d.data()))!);
  }

  async getProblemAny(id: string) {
    const d = await db().collection("problems").doc(id).get();
    return withId<Problem>(d.id, d.exists ? stripTimes(d.data()!) : undefined);
  }

  async listConcepts() {
    const snap = await db().collection("concepts").select("title").get();
    return snap.docs.map((d) => ({ id: d.id, title: (d.get("title") as string) ?? d.id }));
  }

  /** Keeps patterns/{id}.problemCount equal to its published problems. */
  private async recount(patternIds: string[]) {
    for (const pid of new Set(patternIds.filter(Boolean))) {
      const agg = await db()
        .collection("problems")
        .where("primaryPatternId", "==", pid)
        .where("published", "==", true)
        .count()
        .get();
      await db().collection("patterns").doc(pid).set({ problemCount: agg.data().count }, { merge: true });
    }
  }

  async saveProblem(problem: Problem) {
    const ref = db().collection("problems").doc(problem.id);
    const before = await ref.get();
    const solutions = await this.listSolutions(problem.id);
    const { id: _id, ...data } = problem;
    void _id;
    await ref.set({ ...data, solutionSummaries: summarize(solutions), updatedAt: Timestamp.now() });
    await this.recount([problem.primaryPatternId, (before.get("primaryPatternId") as string) ?? ""]);
  }

  async saveSolution(solution: Solution) {
    const problemRef = db().collection("problems").doc(solution.problemId);
    const { id, problemId: _p, ...data } = solution;
    void _p;
    await problemRef.collection("solutions").doc(id).set({ ...data, updatedAt: Timestamp.now() });
    await problemRef.update({ solutionSummaries: summarize(await this.listSolutions(solution.problemId)) });
  }

  async deleteSolution(problemId: string, solutionId: string) {
    const problemRef = db().collection("problems").doc(problemId);
    await problemRef.collection("solutions").doc(solutionId).delete();
    await problemRef.update({ solutionSummaries: summarize(await this.listSolutions(problemId)) });
  }
}

function toUser(uid: string, d: DocumentData): UserRecord {
  return {
    uid,
    name: d.name ?? "",
    email: d.email ?? "",
    photoUrl: d.photoUrl ?? null,
    role: d.role === "admin" ? "admin" : "user",
    plan: {
      tier: d.plan?.tier === "premium" ? "premium" : "free",
      planId: d.plan?.planId ?? null,
      premiumUntil: ms(d.plan?.premiumUntil),
      lastOrderId: d.plan?.lastOrderId ?? null,
    },
    createdAt: ms(d.createdAt) ?? 0,
  };
}

function toOrder(id: string, d: DocumentData): Order {
  return {
    id,
    uid: d.uid,
    planId: d.planId,
    pricePaise: d.pricePaise,
    discountPaise: d.discountPaise,
    taxPaise: d.taxPaise,
    totalPaise: d.totalPaise,
    currency: "INR",
    couponCode: d.couponCode ?? null,
    status: d.status,
    gateway: d.gateway,
    gatewayOrderId: d.gatewayOrderId ?? null,
    gatewayPaymentId: d.gatewayPaymentId ?? null,
    method: d.method ?? null,
    phone: d.phone ?? "",
    periodStart: ms(d.periodStart),
    periodEnd: ms(d.periodEnd),
    createdAt: ms(d.createdAt) ?? 0,
    paidAt: ms(d.paidAt),
  };
}

function orderToDoc(o: Omit<Order, "id">) {
  return {
    ...o,
    periodStart: ts(o.periodStart),
    periodEnd: ts(o.periodEnd),
    createdAt: ts(o.createdAt),
    paidAt: ts(o.paidAt),
  };
}

export class FirestoreAccountStore implements AccountStore {
  async getUser(uid: string) {
    const d = await db().collection("users").doc(uid).get();
    return d.exists ? toUser(uid, d.data()!) : null;
  }

  async ensureUser(u: NewUser) {
    const ref = db().collection("users").doc(u.uid);
    return db().runTransaction(async (tx) => {
      const d = await tx.get(ref);
      if (d.exists) return toUser(u.uid, d.data()!);
      const now = Timestamp.now();
      const doc = {
        name: u.name,
        email: u.email,
        photoUrl: u.photoUrl,
        role: "user",
        plan: { tier: "free", planId: null, premiumUntil: null, lastOrderId: null },
        prefs: { language: "python", speed: 1 },
        stats: { understoodCount: 0, patternsMastered: 0, streakDays: 0, lastActiveDay: null },
        drillsToday: { day: null, count: 0 },
        createdAt: now,
        lastSeenAt: now,
      };
      tx.set(ref, doc);
      return toUser(u.uid, doc);
    });
  }

  async getPlan(id: string) {
    const d = await db().collection("plans").doc(id).get();
    const p = withId<Plan>(d.id, d.exists ? d.data() : undefined);
    return p && p.active ? p : null;
  }

  async getCoupon(code: string) {
    const d = await db().collection("coupons").doc(code.toUpperCase()).get();
    if (!d.exists) return null;
    const c = d.data()!;
    return {
      code: d.id,
      percentOff: c.percentOff,
      planIds: c.planIds ?? [],
      maxUses: c.maxUses,
      usedCount: c.usedCount ?? 0,
      validFrom: ms(c.validFrom) ?? 0,
      validUntil: ms(c.validUntil) ?? 0,
      active: !!c.active,
    } satisfies Coupon;
  }

  async createOrder(o: NewOrder) {
    const ref = db().collection("orders").doc();
    await ref.set(orderToDoc(o));
    return { ...o, id: ref.id };
  }

  async getOrder(id: string) {
    const d = await db().collection("orders").doc(id).get();
    return d.exists ? toOrder(d.id, d.data()!) : null;
  }

  async setGatewayOrderId(id: string, gatewayOrderId: string) {
    await db().collection("orders").doc(id).update({ gatewayOrderId });
  }

  async markOrderFailed(id: string) {
    const ref = db().collection("orders").doc(id);
    await db().runTransaction(async (tx) => {
      const d = await tx.get(ref);
      if (d.exists && d.data()!.status === "created") tx.update(ref, { status: "failed" });
    });
  }

  async fulfillOrder(orderId: string, payment: PaymentInfo, now: number): Promise<FulfillResult> {
    const fs = db();
    const orderRef = fs.collection("orders").doc(orderId);
    return fs.runTransaction(async (tx) => {
      const od = await tx.get(orderRef);
      if (!od.exists) throw new FulfillError("Order not found");
      const order = toOrder(od.id, od.data()!);
      const userRef = fs.collection("users").doc(order.uid);
      const planRef = fs.collection("plans").doc(order.planId);
      const [ud, pd] = await Promise.all([tx.get(userRef), tx.get(planRef)]);
      if (!ud.exists) throw new FulfillError("User not found");
      if (!pd.exists) throw new FulfillError("Plan not found");
      const user = toUser(order.uid, ud.data()!);
      const plan = { ...(pd.data() as Plan), id: pd.id as Plan["id"] };

      const result = applyFulfillment(order, user, plan, payment, now);
      if (!result.changed) return result;

      const { id: _id, ...orderData } = result.order;
      void _id;
      tx.set(orderRef, orderToDoc(orderData));
      tx.update(userRef, {
        plan: { ...result.user.plan, premiumUntil: ts(result.user.plan.premiumUntil) },
      });
      if (order.couponCode) {
        const couponRef = fs.collection("coupons").doc(order.couponCode);
        tx.update(couponRef, { usedCount: FieldValue.increment(1) });
        tx.set(couponRef.collection("redemptions").doc(order.uid), {
          orderId: order.id,
          redeemedAt: Timestamp.fromMillis(now),
        });
      }
      return result;
    });
  }

  async hasRedeemedCoupon(code: string, uid: string) {
    const d = await db()
      .collection("coupons")
      .doc(code.toUpperCase())
      .collection("redemptions")
      .doc(uid)
      .get();
    return d.exists;
  }

  async recordPaymentEvent(key: string, data: Record<string, unknown>) {
    try {
      await db()
        .collection("paymentEvents")
        .doc(key)
        .create({ ...data, receivedAt: Timestamp.now() });
      return true;
    } catch (e) {
      // ALREADY_EXISTS (gRPC code 6) means we have seen this event before.
      if ((e as { code?: number }).code === 6) return false;
      throw e;
    }
  }
}
