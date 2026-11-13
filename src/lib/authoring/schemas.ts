// Validation for content saved from the authoring tool.

import { z } from "zod";

export const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes")
  .min(2)
  .max(80);

const languages = z.enum(["python", "java", "cpp", "javascript"]);

export const ProblemSchema = z.object({
  id: slug,
  number: z.number().int().positive(),
  title: z.string().min(2).max(160),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  primaryPatternId: slug,
  patternIds: z.array(slug).min(1),
  ladderOrder: z.number().int().min(1).max(500),
  description: z.string().min(10).max(4000),
  examples: z
    .array(z.object({ input: z.string().min(1), output: z.string().min(1), note: z.string().optional() }))
    .max(5),
  constraints: z.array(z.string().min(1)).max(10),
  sourceUrl: z.url(),
  conceptIds: z.array(slug).max(10),
  solutionSummaries: z.array(z.any()).default([]),
  companyTags: z.array(z.string()).max(20),
  published: z.boolean(),
});

const StepSchema = z.object({
  lines: z.partialRecord(languages, z.array(z.number().int().positive())),
  note: z.string().min(1).max(400),
  vars: z.array(z.object({ name: z.string(), value: z.string().max(300) })).max(30),
  window: z.tuple([z.number().int(), z.number().int()]).nullable(),
  inIndex: z.number().int().nullable(),
  outIndex: z.number().int().nullable(),
  check: z
    .object({ left: z.string(), op: z.string(), right: z.string(), result: z.boolean() })
    .nullable(),
  conceptId: slug.nullable(),
  done: z.boolean(),
  marks: z.array(z.object({ at: z.number().int().min(0), label: z.string().min(1).max(12) })).max(4).optional(),
});

export const RecordingSchema = z.object({
  setup: z.string().max(2000),
  call: z.string().max(300),
  trackVar: z.string().nullable(),
  leftVar: z.string().nullable(),
  rightVar: z.string().nullable(),
  indexVar: z.string().nullable(),
  sizeVar: z.string().nullable(),
  hiddenVars: z.array(z.string()),
  skipQuiet: z.boolean(),
  pointerMode: z.enum(["window", "pair"]).optional(),
  markVars: z.array(z.string().min(1).max(12)).max(4).optional(),
});

export const SolutionSchema = z.object({
  id: slug,
  problemId: slug,
  order: z.number().int().min(1).max(20),
  name: z.string().min(2).max(80),
  kind: z.enum(["brute", "better", "optimal"]),
  tier: z.enum(["free", "premium"]),
  time: z.string().min(1).max(40),
  space: z.string().min(1).max(40),
  complexityWhy: z.string().max(600),
  bottleneck: z.string().max(600),
  insight: z.string().max(600),
  code: z.partialRecord(languages, z.string().max(20000)),
  input: z.record(z.string(), z.string()),
  track: z.object({ label: z.string().max(40), items: z.array(z.string().max(40)).max(60) }),
  pointerStyle: z.enum(["LR", "i", "pair", "none"]),
  pointerNames: z.tuple([z.string().min(1).max(12), z.string().min(1).max(12)]).optional(),
  steps: z.array(StepSchema).min(1).max(300),
  version: z.number().int().min(1),
  authoring: RecordingSchema.optional(),
});
