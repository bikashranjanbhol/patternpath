// Shared domain types. These mirror the Firestore collections in the
// "PatternPath — Database Design" doc. Timestamps are converted to epoch
// milliseconds before they leave the data layer so every value is serializable.

export type Difficulty = "Easy" | "Medium" | "Hard";
export type SolutionKind = "brute" | "better" | "optimal";
export type Tier = "free" | "premium";
export type Language = "python" | "java" | "cpp" | "javascript";

export const LANGUAGE_LABELS: Record<Language, string> = {
  python: "Python",
  java: "Java",
  cpp: "C++",
  javascript: "JavaScript",
};

export interface Pattern {
  id: string;
  name: string;
  order: number;
  group: string;
  summary: string;
  signals: string[];
  notSignals: string[];
  template: Partial<Record<Language, string>>;
  conceptId: string | null;
  problemCount: number;
  published: boolean;
}

export interface Example {
  input: string;
  output: string;
  note?: string;
}

export interface SolutionSummary {
  solutionId: string;
  name: string;
  kind: SolutionKind;
  tier: Tier;
  time: string;
  space: string;
  stepCount: number;
}

export interface Problem {
  id: string;
  number: number;
  title: string;
  difficulty: Difficulty;
  primaryPatternId: string;
  patternIds: string[];
  ladderOrder: number;
  description: string;
  examples: Example[];
  constraints: string[];
  sourceUrl: string;
  conceptIds: string[];
  solutionSummaries: SolutionSummary[];
  companyTags: string[];
  published: boolean;
}

export interface StepVar {
  name: string;
  value: string;
}

export interface StepCheck {
  left: string;
  op: string;
  right: string;
  result: boolean;
}

export interface Step {
  lines: Partial<Record<Language, number[]>>;
  note: string;
  vars: StepVar[];
  window: [number, number] | null;
  inIndex: number | null;
  outIndex: number | null;
  check: StepCheck | null;
  conceptId: string | null;
  done: boolean;
}

/** How a solution's dry run was recorded, so it can be re-recorded later. */
export interface RecordingConfig {
  /** Python lines that set up the example input, e.g. s1 = "ab". */
  setup: string;
  /** The call to trace, e.g. checkInclusion(s1, s2). */
  call: string;
  /** Variable drawn as cells (a string or list from the setup). */
  trackVar: string | null;
  /** Window as two index variables… */
  leftVar: string | null;
  rightVar: string | null;
  /** …or as a start index plus a fixed size (a variable name or a number). */
  indexVar: string | null;
  sizeVar: string | null;
  /** Variables never shown in the variables table. */
  hiddenVars: string[];
  /** Drop lines that change nothing and test nothing. */
  skipQuiet: boolean;
  /**
   * How leftVar/rightVar are drawn: "window" shades every cell between them
   * (sliding window); "pair" marks only the two cells (two pointers, i/j loops).
   * Missing means "window".
   */
  pointerMode?: "window" | "pair";
}

export interface Solution {
  id: string;
  problemId: string;
  order: number;
  name: string;
  kind: SolutionKind;
  tier: Tier;
  time: string;
  space: string;
  complexityWhy: string;
  bottleneck: string;
  insight: string;
  code: Partial<Record<Language, string>>;
  input: Record<string, string>;
  /** The sequence drawn as cells in the dry run, e.g. the string s2. */
  track: { label: string; items: string[] };
  /** How pointers are labelled: L/R for windows, i for a start index, none. */
  pointerStyle: "LR" | "i" | "pair" | "none";
  /** Labels under the two pointer cells, e.g. ["i", "j"]. Default L and R. */
  pointerNames?: [string, string];
  steps: Step[];
  version: number;
  authoring?: RecordingConfig;
}

export interface ConceptSection {
  heading: string;
  paragraphs: string[];
  code?: string;
}

export interface Concept {
  id: string;
  title: string;
  summary: string;
  level: string;
  readMinutes: number;
  sections: ConceptSection[];
  prerequisiteIds: string[];
  relatedIds: string[];
  practiceProblemIds: string[];
  published: boolean;
}

export interface Plan {
  id: "monthly" | "sprint" | "yearly";
  name: string;
  months: number;
  pricePaise: number;
  perks: string[];
  active: boolean;
  order: number;
}

export interface Coupon {
  code: string;
  percentOff: number;
  planIds: string[];
  maxUses: number;
  usedCount: number;
  validFrom: number;
  validUntil: number;
  active: boolean;
}

export type OrderStatus = "created" | "paid" | "failed" | "expired" | "refunded";

export interface Order {
  id: string;
  uid: string;
  planId: Plan["id"];
  pricePaise: number;
  discountPaise: number;
  taxPaise: number;
  totalPaise: number;
  currency: "INR";
  couponCode: string | null;
  status: OrderStatus;
  gateway: "cashfree" | "mock";
  gatewayOrderId: string | null;
  gatewayPaymentId: string | null;
  method: string | null;
  phone: string;
  periodStart: number | null;
  periodEnd: number | null;
  createdAt: number;
  paidAt: number | null;
}

export interface UserRecord {
  uid: string;
  name: string;
  email: string;
  photoUrl: string | null;
  role: "user" | "admin";
  plan: {
    tier: Tier;
    planId: Plan["id"] | null;
    premiumUntil: number | null;
    lastOrderId: string | null;
  };
  createdAt: number;
}

/** The signed-in person as seen by a request. */
export interface Viewer {
  uid: string;
  name: string;
  email: string;
  photoUrl: string | null;
  role: "user" | "admin";
  premiumUntil: number | null;
}
