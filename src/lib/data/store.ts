import "server-only";
import { config } from "@/lib/config";
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

export interface NewUser {
  uid: string;
  name: string;
  email: string;
  photoUrl: string | null;
}

export type NewOrder = Omit<Order, "id">;

export interface PaymentInfo {
  gatewayPaymentId: string | null;
  method: string | null;
}

export interface FulfillResult {
  order: Order;
  user: UserRecord;
  /** False when the order was already paid (a repeated webhook or poll). */
  changed: boolean;
}

/** Read-only content. Written by admins (or the seed script). */
export interface ContentStore {
  listPatterns(): Promise<Pattern[]>;
  getPattern(id: string): Promise<Pattern | null>;
  listProblemsByPattern(patternId: string): Promise<Problem[]>;
  getProblem(id: string): Promise<Problem | null>;
  listSolutions(problemId: string): Promise<Solution[]>;
  getConcept(id: string): Promise<Concept | null>;
  listConceptIds(): Promise<string[]>;
  listProblemIds(): Promise<string[]>;
  listPlans(): Promise<Plan[]>;
}

/** Content editing for admins. Reads here are never cached. */
export interface ContentAdmin {
  /** Every problem, published or not, newest number first. */
  listAllProblems(): Promise<Problem[]>;
  getProblemAny(id: string): Promise<Problem | null>;
  listConcepts(): Promise<Pick<Concept, "id" | "title">[]>;
  saveProblem(problem: Problem): Promise<void>;
  /** Saves a solution and refreshes the problem's solution summaries. */
  saveSolution(solution: Solution): Promise<void>;
  deleteSolution(problemId: string, solutionId: string): Promise<void>;
}

/** Thrown when content can't be saved here (e.g. demo mode on a read-only host). */
export class ContentReadOnlyError extends Error {}

/** Per-user and payment data. Never cached. */
export interface AccountStore {
  getUser(uid: string): Promise<UserRecord | null>;
  ensureUser(user: NewUser): Promise<UserRecord>;
  getPlan(id: string): Promise<Plan | null>;
  getCoupon(code: string): Promise<Coupon | null>;
  hasRedeemedCoupon(code: string, uid: string): Promise<boolean>;
  createOrder(order: NewOrder): Promise<Order>;
  getOrder(id: string): Promise<Order | null>;
  setGatewayOrderId(id: string, gatewayOrderId: string): Promise<void>;
  markOrderFailed(id: string): Promise<void>;
  /** Marks an order paid and extends the user's Premium. Safe to call twice. */
  fulfillOrder(orderId: string, payment: PaymentInfo, now: number): Promise<FulfillResult>;
  /** Returns false if this event key was already recorded. */
  recordPaymentEvent(key: string, data: Record<string, unknown>): Promise<boolean>;
}

let content: (ContentStore & ContentAdmin) | undefined;
let accounts: AccountStore | undefined;

export async function contentStore(): Promise<ContentStore & ContentAdmin> {
  if (!content) {
    content =
      config.dataSource === "firestore"
        ? new (await import("./firestore-store")).FirestoreContentStore()
        : new (await import("./local-store")).LocalContentStore();
  }
  return content;
}

export async function accountStore(): Promise<AccountStore> {
  if (!accounts) {
    accounts =
      config.dataSource === "firestore"
        ? new (await import("./firestore-store")).FirestoreAccountStore()
        : new (await import("./local-store")).LocalAccountStore();
  }
  return accounts;
}

export async function contentAdmin(): Promise<ContentAdmin> {
  return contentStore();
}

/** Solution summaries kept on the problem document (no code, safe to show). */
export { summarize } from "@/lib/summarize";
