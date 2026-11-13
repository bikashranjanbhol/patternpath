import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { contentStore } from "@/lib/data/store";

// Cached content reads. Content changes rarely, so pages are served from the
// cache and Firestore is read only when an entry refreshes (every few hours)
// or when an admin edit calls revalidateTag("content").

export async function getPatterns() {
  "use cache";
  cacheLife("hours");
  cacheTag("content", "patterns");
  return (await contentStore()).listPatterns();
}

export async function getPattern(id: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("content", `pattern:${id}`);
  return (await contentStore()).getPattern(id);
}

export async function getPatternProblems(patternId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("content", `pattern:${patternId}`);
  return (await contentStore()).listProblemsByPattern(patternId);
}

export async function getProblem(id: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("content", `problem:${id}`);
  return (await contentStore()).getProblem(id);
}

/** Full solutions, including Premium code. Server-only: never send as-is. */
export async function getSolutions(problemId: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("content", `problem:${problemId}`);
  return (await contentStore()).listSolutions(problemId);
}

export async function getConcept(id: string) {
  "use cache";
  cacheLife("hours");
  cacheTag("content", `concept:${id}`);
  return (await contentStore()).getConcept(id);
}

export async function getPlans() {
  "use cache";
  cacheLife("hours");
  cacheTag("content", "plans");
  return (await contentStore()).listPlans();
}

export async function getProblemIds() {
  "use cache";
  cacheLife("hours");
  cacheTag("content");
  return (await contentStore()).listProblemIds();
}

export async function getConceptIds() {
  "use cache";
  cacheLife("hours");
  cacheTag("content");
  return (await contentStore()).listConceptIds();
}
