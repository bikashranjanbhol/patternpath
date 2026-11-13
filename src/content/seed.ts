// Seed content. Used directly when DATA_SOURCE=local, and written to
// Firestore by `npm run seed` when DATA_SOURCE=firestore.
//
// Problem descriptions are written in our own words; never paste LeetCode's text.
// Plan prices below are SAMPLE values for development only — set real prices
// in Firestore (plans collection) before launch.

import type {
  Concept,
  Coupon,
  Pattern,
  Plan,
  Problem,
  Solution,
  Step,
  StepVar,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Patterns
// ---------------------------------------------------------------------------

const SLIDING_TEMPLATE = `def longest_window(s):
    window = {}
    left = best = 0
    for right, ch in enumerate(s):
        window[ch] = window.get(ch, 0) + 1   # expand
        while is_invalid(window):            # shrink
            window[s[left]] -= 1
            left += 1
        best = max(best, right - left + 1)   # record
    return best`;

const basicPatterns: Array<[string, string, string, string]> = [
  ["two-pointers", "Two Pointers", "Arrays & Strings", "Move two indexes toward each other or in step to avoid nested loops on sorted or paired data."],
  ["sliding-window", "Sliding Window", "Arrays & Strings", "Keep a contiguous range. Grow it on the right, shrink it on the left only when it breaks a rule."],
  ["prefix-sum", "Prefix Sum", "Arrays & Strings", "Precompute running totals so any range sum takes one subtraction."],
  ["hashing", "Hashing & Counting", "Arrays & Strings", "Use a hash map or set to remember what you have seen in O(1)."],
  ["binary-search", "Binary Search", "Search", "Halve the search space each step on anything sorted or monotonic."],
  ["monotonic-stack", "Monotonic Stack", "Linear structures", "Keep a stack in increasing or decreasing order to find the next greater or smaller item."],
  ["fast-slow-pointers", "Fast & Slow Pointers", "Linear structures", "Two pointers at different speeds detect cycles and find middles."],
  ["list-reversal", "In-place List Reversal", "Linear structures", "Reverse links in place with three pointers."],
  ["merge-intervals", "Merge Intervals", "Arrays & Strings", "Sort by start, then merge or compare neighbours."],
  ["heap-top-k", "Heap / Top-K", "Search", "Keep the best k items in a heap instead of sorting everything."],
  ["tree-bfs", "Tree BFS", "Trees", "Visit a tree level by level with a queue."],
  ["tree-dfs", "Tree DFS", "Trees", "Recurse down a tree and combine answers on the way back up."],
  ["graph-traversal", "Graph Traversal", "Graphs", "Explore connected parts of a grid or graph with BFS or DFS."],
  ["topological-sort", "Topological Sort", "Graphs", "Order tasks so every dependency comes first."],
  ["backtracking", "Backtracking", "Recursion", "Build answers step by step and undo choices that fail."],
  ["dynamic-programming", "Dynamic Programming", "Recursion", "Solve each subproblem once and reuse the answer."],
];

export const patterns: Pattern[] = basicPatterns.map(([id, name, group, summary], i) => ({
  id,
  name,
  order: i + 1,
  group,
  summary,
  signals: [],
  notSignals: [],
  template: {},
  conceptId: null,
  problemCount: 0,
  published: true,
}));

const sliding = patterns.find((p) => p.id === "sliding-window")!;
Object.assign(sliding, {
  summary:
    "Keep a contiguous range over an array or string. Grow it from the right, shrink it from the left only when it breaks a rule, and you visit each element at most twice.",
  signals: [
    '"subarray" or "substring": the answer is a contiguous range',
    '"longest", "shortest" or "of size k"',
    '"at most k" or "without repeating": a rule you can repair as the window moves',
  ],
  notSignals: ["Negative numbers with a target sum: use Prefix Sum + a hash map instead"],
  template: { python: SLIDING_TEMPLATE },
  conceptId: "sliding-window",
  problemCount: 2,
} satisfies Partial<Pattern>);

const TWO_POINTERS_TEMPLATE = `def solve(nums, target):        # nums is sorted
    left, right = 0, len(nums) - 1
    while left < right:
        total = nums[left] + nums[right]
        if total == target:
            return [left, right]
        if total < target:
            left += 1      # too small: drop the smallest value
        else:
            right -= 1     # too big: drop the largest value
    return []`;

const twoPointers = patterns.find((p) => p.id === "two-pointers")!;
Object.assign(twoPointers, {
  summary:
    "Two indexes walk the data together so one pass replaces a nested loop. On sorted data they start at both ends, and every comparison rules out one value.",
  signals: [
    "The input is sorted, or sorting it doesn't change the answer",
    '"pair", "two numbers", or comparing both ends of a string',
    "In-place work: remove duplicates, move zeros, reverse",
  ],
  notSignals: ["You need original positions and the input isn't sorted: a hash map is often simpler"],
  template: { python: TWO_POINTERS_TEMPLATE },
  conceptId: "two-pointers",
} satisfies Partial<Pattern>);

// ---------------------------------------------------------------------------
// Helpers for writing dry-run steps
// ---------------------------------------------------------------------------

const v = (name: string, value: string): StepVar => ({ name, value });

function step(partial: Partial<Step> & { py: number[]; note: string }): Step {
  const { py, ...rest } = partial;
  return {
    lines: { python: py },
    vars: [],
    window: null,
    inIndex: null,
    outIndex: null,
    check: null,
    conceptId: null,
    done: false,
    ...rest,
  };
}

// ---------------------------------------------------------------------------
// #567 Permutation in String
// ---------------------------------------------------------------------------

const p567Brute: Solution = {
  id: "brute-force",
  problemId: "567-permutation-in-string",
  order: 1,
  name: "Try every permutation",
  kind: "brute",
  tier: "free",
  time: "O(k!·n)",
  space: "O(k)",
  complexityWhy:
    "There are k! orderings of s1, and each one is searched for in s2, which costs up to n·k.",
  bottleneck:
    "The number of orderings explodes: 10 letters already give 3,628,800 strings to search for.",
  insight: "Order inside the window never matters. Only which letters it holds, and how many.",
  code: {
    python: `from itertools import permutations

def checkInclusion(s1, s2):
    for p in permutations(s1):
        if "".join(p) in s2:
            return True
    return False`,
  },
  input: { s1: "ab", s2: "eidbaooo" },
  track: { label: "s2", items: "eidbaooo".split("") },
  pointerStyle: "none",
  version: 1,
  steps: [
    step({ py: [4], vars: [v("p", "('a', 'b')")], note: 'Generate the first ordering of s1: "ab".', conceptId: "permutations" }),
    step({ py: [5], vars: [v("p", "('a', 'b')")], check: { left: '"ab"', op: "in", right: 's2 = "eidbaooo"', result: false }, note: 'Scan all of s2 for "ab". It is not there.' }),
    step({ py: [4], vars: [v("p", "('b', 'a')")], note: 'Move on to the next ordering: "ba".' }),
    step({ py: [5], window: [3, 4], vars: [v("p", "('b', 'a')")], check: { left: '"ba"', op: "in", right: 's2 = "eidbaooo"', result: true }, note: 'Found "ba" starting at index 3.' }),
    step({ py: [6], window: [3, 4], vars: [v("p", "('b', 'a')")], done: true, note: "Return True. It works here only because s1 has 2 letters." }),
  ],
};

const tgt = v("target", "['a', 'b']");
const p567Sort: Solution = {
  id: "sort-window",
  problemId: "567-permutation-in-string",
  order: 2,
  name: "Sort every window",
  kind: "better",
  tier: "premium",
  time: "O(n·k log k)",
  space: "O(k)",
  complexityWhy: "There are about n windows, and sorting each one costs k log k.",
  bottleneck:
    "Each window is re-sorted from scratch, even though it shares all but one letter with the last window.",
  insight:
    "When the window slides, one letter comes in and one goes out. Update a count instead of rebuilding.",
  code: {
    python: `def checkInclusion(s1, s2):
    k = len(s1)
    target = sorted(s1)
    for i in range(len(s2) - k + 1):
        if sorted(s2[i:i + k]) == target:
            return True
    return False`,
  },
  input: { s1: "ab", s2: "eidbaooo" },
  track: { label: "s2", items: "eidbaooo".split("") },
  pointerStyle: "i",
  version: 1,
  steps: [
    step({ py: [2], vars: [v("k", "2")], note: "Any rearrangement of s1 is exactly 2 letters long." }),
    step({ py: [3], vars: [v("k", "2"), tgt], note: "Sort s1 once. Two strings are rearrangements of each other if they sort to the same list.", conceptId: "sorting-anagrams" }),
    step({ py: [4, 5], window: [0, 1], vars: [v("k", "2"), tgt, v("i", "0")], check: { left: 'sorted("ei") = [e, i]', op: "==", right: "target = [a, b]", result: false }, note: 'Window "ei" sorts to [e, i]. No match.', conceptId: "sliding-window" }),
    step({ py: [4, 5], window: [1, 2], vars: [v("k", "2"), tgt, v("i", "1")], check: { left: 'sorted("id") = [d, i]', op: "==", right: "target = [a, b]", result: false }, note: 'Slide to "id" and sort it again. No match.' }),
    step({ py: [4, 5], window: [2, 3], vars: [v("k", "2"), tgt, v("i", "2")], check: { left: 'sorted("db") = [b, d]', op: "==", right: "target = [a, b]", result: false }, note: '"db" sorts to [b, d]. Still no match.' }),
    step({ py: [4, 5], window: [3, 4], vars: [v("k", "2"), tgt, v("i", "3")], check: { left: 'sorted("ba") = [a, b]', op: "==", right: "target = [a, b]", result: true }, note: '"ba" sorts to [a, b]. It matches the target.' }),
    step({ py: [6], window: [3, 4], vars: [v("k", "2"), tgt, v("i", "3")], done: true, note: "Return True." }),
  ],
};

function optimal567Steps(): Step[] {
  const K = v("k", "2");
  const N = v("need", "{a:1, b:1}");
  const steps: Step[] = [
    step({ py: [4], vars: [K], note: "The window is fixed at len(s1) = 2. Any match must be exactly that long.", conceptId: "sliding-window" }),
    step({ py: [5], vars: [K, N], note: 'Count the letters we need: one "a" and one "b".', conceptId: "hash-map" }),
    step({ py: [6], window: [0, 1], vars: [K, N, v("window", "{e:1, i:1}")], note: 'Count the first window, s2[0:2] = "ei".' }),
    step({ py: [7], window: [0, 1], vars: [K, N, v("window", "{e:1, i:1}")], check: { left: "window {e:1, i:1}", op: "==", right: "need {a:1, b:1}", result: false }, note: "The counts differ, so start sliding." }),
  ];
  const iters: Array<[number, string, number, string, string, string, boolean]> = [
    [2, "d", 0, "e", "{e:1, i:1, d:1}", "{i:1, d:1}", false],
    [3, "b", 1, "i", "{i:1, d:1, b:1}", "{d:1, b:1}", false],
    [4, "a", 2, "d", "{d:1, b:1, a:1}", "{b:1, a:1}", true],
  ];
  for (const [r, ch, o, och, before, after, eq] of iters) {
    const R = v("right", String(r));
    steps.push(
      step({ py: [9, 10], window: [o, r], inIndex: r, vars: [K, N, R, v("window", before)], note: `right = ${r}. Add the incoming letter s2[${r}] = "${ch}".` }),
      step({ py: [11, 12, 13, 14], window: [o + 1, r], outIndex: o, vars: [K, N, R, v("out", `"${och}"`), v("window", after)], note: `Drop s2[${o}] = "${och}" off the left. Its count hits 0, so delete the key.` }),
      step({ py: eq ? [15, 16] : [15], window: [o + 1, r], done: eq, vars: [K, N, R, v("out", `"${och}"`), v("window", after)], check: { left: `window ${after}`, op: "==", right: "need {a:1, b:1}", result: eq }, note: eq ? 'The counts match, so "ba" is a rearrangement of "ab". Return True.' : "Not equal yet. Keep sliding." }),
    );
  }
  return steps;
}

const p567Optimal: Solution = {
  id: "optimal",
  problemId: "567-permutation-in-string",
  order: 3,
  name: "Sliding window + counts",
  kind: "optimal",
  tier: "premium",
  time: "O(n)",
  space: "O(1)",
  complexityWhy:
    "Each letter of s2 enters the window once and leaves once. The count maps hold at most 26 lowercase letters, so space is constant.",
  bottleneck: "Comparing two count maps costs up to 26 checks per slide. Fine for interviews.",
  insight:
    "Track how many of the 26 letters already match, so each slide updates one number. That is the usual follow-up question.",
  code: {
    python: `from collections import Counter

def checkInclusion(s1, s2):
    k = len(s1)
    need = Counter(s1)
    window = Counter(s2[:k])
    if window == need:
        return True
    for right in range(k, len(s2)):
        window[s2[right]] += 1
        out = s2[right - k]
        window[out] -= 1
        if window[out] == 0:
            del window[out]
        if window == need:
            return True
    return False`,
  },
  input: { s1: "ab", s2: "eidbaooo" },
  track: { label: "s2", items: "eidbaooo".split("") },
  pointerStyle: "LR",
  version: 1,
  steps: optimal567Steps(),
};

// ---------------------------------------------------------------------------
// #643 Maximum Average Subarray I
// ---------------------------------------------------------------------------

const nums643 = ["1", "12", "-5", "-6", "50", "3"];

const p643Brute: Solution = {
  id: "brute-force",
  problemId: "643-maximum-average-subarray-i",
  order: 1,
  name: "Add up every window",
  kind: "brute",
  tier: "free",
  time: "O(n·k)",
  space: "O(1)",
  complexityWhy: "There are about n windows, and adding up each one costs k.",
  bottleneck: "Neighbouring windows share k − 1 numbers, but each sum starts again from zero.",
  insight: "Subtract the number that leaves and add the number that arrives: one step per slide.",
  code: {
    python: `def findMaxAverage(nums, k):
    best = float('-inf')
    for i in range(len(nums) - k + 1):
        total = sum(nums[i:i + k])
        best = max(best, total)
    return best / k`,
  },
  input: { nums: "[1, 12, -5, -6, 50, 3]", k: "4" },
  track: { label: "nums", items: nums643 },
  pointerStyle: "i",
  version: 1,
  steps: [
    step({ py: [2], vars: [v("best", "-inf")], note: "Start with the smallest possible best sum." }),
    step({ py: [3, 4], window: [0, 3], vars: [v("best", "-inf"), v("i", "0"), v("total", "2")], note: "Add up the first 4 numbers: 1 + 12 − 5 − 6 = 2." }),
    step({ py: [5], window: [0, 3], vars: [v("best", "2"), v("i", "0"), v("total", "2")], check: { left: "total 2", op: ">", right: "best -inf", result: true }, note: "2 is the best so far." }),
    step({ py: [3, 4], window: [1, 4], vars: [v("best", "2"), v("i", "1"), v("total", "51")], note: "Move one step and add 4 numbers again: 12 − 5 − 6 + 50 = 51." }),
    step({ py: [5], window: [1, 4], vars: [v("best", "51"), v("i", "1"), v("total", "51")], check: { left: "total 51", op: ">", right: "best 2", result: true }, note: "51 beats 2." }),
    step({ py: [3, 4], window: [2, 5], vars: [v("best", "51"), v("i", "2"), v("total", "42")], note: "Last window: −5 − 6 + 50 + 3 = 42." }),
    step({ py: [5], window: [2, 5], vars: [v("best", "51"), v("i", "2"), v("total", "42")], check: { left: "total 42", op: ">", right: "best 51", result: false }, note: "42 is smaller, so best stays 51." }),
    step({ py: [6], vars: [v("best", "51")], done: true, note: "Return 51 / 4 = 12.75." }),
  ],
};

const p643Optimal: Solution = {
  id: "optimal",
  problemId: "643-maximum-average-subarray-i",
  order: 2,
  name: "Fixed sliding window",
  kind: "optimal",
  tier: "premium",
  time: "O(n)",
  space: "O(1)",
  complexityWhy: "Each slide does one addition and one subtraction, and there are n − k slides.",
  bottleneck: "None left for this problem: every number is touched a constant number of times.",
  insight: "The same running-sum idea works for any fixed-width window measure.",
  code: {
    python: `def findMaxAverage(nums, k):
    window = sum(nums[:k])
    best = window
    for right in range(k, len(nums)):
        window += nums[right] - nums[right - k]
        best = max(best, window)
    return best / k`,
  },
  input: { nums: "[1, 12, -5, -6, 50, 3]", k: "4" },
  track: { label: "nums", items: nums643 },
  pointerStyle: "LR",
  version: 1,
  steps: [
    step({ py: [2], window: [0, 3], vars: [v("window", "2")], note: "Add up the first window once: 1 + 12 − 5 − 6 = 2.", conceptId: "sliding-window" }),
    step({ py: [3], window: [0, 3], vars: [v("window", "2"), v("best", "2")], note: "That is the best so far." }),
    step({ py: [4, 5], window: [1, 4], inIndex: 4, outIndex: 0, vars: [v("window", "51"), v("best", "2"), v("right", "4")], note: "Slide: add nums[4] = 50, drop nums[0] = 1. 2 + 50 − 1 = 51." }),
    step({ py: [6], window: [1, 4], vars: [v("window", "51"), v("best", "51"), v("right", "4")], check: { left: "window 51", op: ">", right: "best 2", result: true }, note: "51 is the new best." }),
    step({ py: [4, 5], window: [2, 5], inIndex: 5, outIndex: 1, vars: [v("window", "42"), v("best", "51"), v("right", "5")], note: "Slide: add 3, drop 12. 51 + 3 − 12 = 42." }),
    step({ py: [6], window: [2, 5], vars: [v("window", "42"), v("best", "51"), v("right", "5")], check: { left: "window 42", op: ">", right: "best 51", result: false }, note: "42 is smaller, so best stays 51." }),
    step({ py: [7], vars: [v("best", "51")], done: true, note: "Return 51 / 4 = 12.75." }),
  ],
};

export const solutions: Solution[] = [p567Brute, p567Sort, p567Optimal, p643Brute, p643Optimal];

function summaries(problemId: string) {
  return solutions
    .filter((s) => s.problemId === problemId)
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      solutionId: s.id,
      name: s.name,
      kind: s.kind,
      tier: s.tier,
      time: s.time,
      space: s.space,
      stepCount: s.steps.length,
    }));
}

export const problems: Problem[] = [
  {
    id: "643-maximum-average-subarray-i",
    number: 643,
    title: "Maximum Average Subarray I",
    difficulty: "Easy",
    primaryPatternId: "sliding-window",
    patternIds: ["sliding-window"],
    ladderOrder: 1,
    description:
      "Given an array of numbers and a length k, find the largest average of any k numbers that sit next to each other.",
    examples: [{ input: "nums = [1, 12, -5, -6, 50, 3], k = 4", output: "12.75", note: "(12 − 5 − 6 + 50) / 4" }],
    constraints: ["1 ≤ k ≤ n ≤ 10⁵", "−10⁴ ≤ nums[i] ≤ 10⁴"],
    sourceUrl: "https://leetcode.com/problems/maximum-average-subarray-i/",
    conceptIds: ["sliding-window"],
    solutionSummaries: summaries("643-maximum-average-subarray-i"),
    companyTags: [],
    published: true,
  },
  {
    id: "567-permutation-in-string",
    number: 567,
    title: "Permutation in String",
    difficulty: "Medium",
    primaryPatternId: "sliding-window",
    patternIds: ["sliding-window", "hashing"],
    ladderOrder: 4,
    description:
      "Given two strings s1 and s2, return true if some rearrangement of s1 appears as a contiguous substring of s2, otherwise false.",
    examples: [
      { input: 's1 = "ab", s2 = "eidbaooo"', output: "true", note: '"ba" is in s2' },
      { input: 's1 = "ab", s2 = "eidboaoo"', output: "false" },
    ],
    constraints: ["1 ≤ s1.length, s2.length ≤ 10⁴", "Lowercase English letters only"],
    sourceUrl: "https://leetcode.com/problems/permutation-in-string/",
    conceptIds: ["sliding-window", "hash-map", "permutations"],
    solutionSummaries: summaries("567-permutation-in-string"),
    companyTags: [],
    published: true,
  },
];

// ---------------------------------------------------------------------------
// Concepts
// ---------------------------------------------------------------------------

export const concepts: Concept[] = [
  {
    id: "sliding-window",
    title: "Sliding Window, explained from zero",
    summary:
      'A way to look at every contiguous chunk of an array or string without starting over each time. If a problem says "subarray" or "substring", this is usually the first idea to try.',
    level: "Beginner",
    readMinutes: 12,
    published: true,
    prerequisiteIds: ["hash-map"],
    relatedIds: [],
    practiceProblemIds: ["643-maximum-average-subarray-i", "567-permutation-in-string"],
    sections: [
      {
        heading: "Why it exists",
        paragraphs: [
          "Say you want the largest sum of any 3 numbers in a row in [2, 1, 5, 1, 3, 2]. The obvious way adds up 3 numbers, moves one step, and adds up 3 numbers again from scratch.",
          "Neighbouring chunks share 2 of their 3 numbers, so re-adding them is wasted work. Instead, subtract the number that left and add the number that arrived. That turns O(n·k) into O(n).",
        ],
      },
      {
        heading: "Fixed vs variable windows",
        paragraphs: [
          'Fixed size: the width is given, like "any 3 in a row" or "a rearrangement of s1". Both ends move together.',
          "Variable size: you want the longest or shortest window that follows a rule. The right end grows; the left end catches up only when the rule breaks.",
        ],
      },
      {
        heading: "Write the code in 4 steps",
        paragraphs: [
          "1. Set up: two pointers, left and right, and one running value for whatever the problem measures.",
          "2. Expand: move right one cell and add the new item.",
          "3. Shrink: if the window is too wide or breaks the rule, remove the item at left and move left forward. For variable windows this is a while loop.",
          "4. Record: the window is valid again, so compare it with the best answer so far.",
        ],
        code: `def max_sum(nums, k):
    left = 0
    window_sum = 0
    best = float('-inf')
    for right in range(len(nums)):
        window_sum += nums[right]          # expand
        if right - left + 1 > k:           # too wide?
            window_sum -= nums[left]       # shrink
            left += 1
        if right - left + 1 == k:
            best = max(best, window_sum)   # record
    return best`,
      },
      {
        heading: "Spot it in a problem",
        paragraphs: [
          'The answer is a contiguous part: "subarray", "substring", "consecutive".',
          "It asks for the longest, shortest or best such part, or one of size k.",
          'There is a rule you can update as items enter and leave: a sum, a count, "no repeats".',
          "Watch out: negative numbers with a target sum break shrinking. Use a prefix sum with a hash map instead.",
        ],
      },
    ],
  },
  {
    id: "two-pointers",
    title: "Two Pointers, explained from zero",
    summary:
      "Two indexes walk through the data together, so one pass replaces a nested loop. Most often they start at both ends of a sorted array and move toward each other.",
    level: "Beginner",
    readMinutes: 10,
    published: true,
    prerequisiteIds: [],
    relatedIds: ["sliding-window"],
    practiceProblemIds: ["1-two-sum", "167-two-sum-ii-input-array-is-sorted", "125-valid-palindrome", "15-3sum"],
    sections: [
      {
        heading: "Why it exists",
        paragraphs: [
          "Say you want two numbers in [1, 4, 7, 11, 15] that add up to 18. Trying every pair means about n²/2 sums.",
          "Because the list is sorted, one sum tells you which way to go. 1 + 15 = 16 is too small, and 15 is the largest value, so 1 can never be part of the answer. Drop it and move on. Every sum rules out one value, so the whole search takes at most n steps.",
        ],
      },
      {
        heading: "The three common shapes",
        paragraphs: [
          "Opposite ends: left starts at 0 and right at the last index, and they move toward each other. Used for pair sums, palindromes and container problems. Usually needs sorted data or a symmetric question.",
          "Same direction, different jobs: a slow pointer marks where the next kept item goes, and a fast pointer scans. Used to remove duplicates or move zeros in place.",
          "Two inputs: one pointer per array, and you always advance the one with the smaller value. Used to merge sorted lists or find common items.",
        ],
      },
      {
        heading: "Write the code in 4 steps",
        paragraphs: [
          "1. Set up: left = 0 and right = len(nums) - 1 (or both at 0 for same-direction problems).",
          "2. Loop while left < right.",
          "3. Look at the two items and decide. If they are the answer, stop.",
          "4. Move exactly one pointer, the one whose value can't be part of the answer. That move is what makes it O(n).",
        ],
        code: `def pair_with_sum(nums, target):     # nums is sorted
    left, right = 0, len(nums) - 1
    while left < right:
        total = nums[left] + nums[right]
        if total == target:
            return [left, right]
        if total < target:
            left += 1      # too small: drop the smallest value
        else:
            right -= 1     # too big: drop the largest value
    return []`,
      },
      {
        heading: "Spot it in a problem",
        paragraphs: [
          "The input is sorted, or sorting it doesn't break the question.",
          "You compare or combine two items: a pair sum, the two ends of a string, two lists.",
          "The brute force is a nested loop over pairs, and one comparison tells you which pair to skip.",
          "Watch out: if the problem needs the original positions, sorting loses them. Keep (value, index) pairs, or use a hash map instead.",
        ],
      },
    ],
  },
  {
    id: "hash-map",
    title: "Hash maps for counting",
    summary: "A hash map stores key → value pairs and finds any key in about O(1) time. Counting letters or numbers is its most common use in interviews.",
    level: "Beginner",
    readMinutes: 5,
    published: true,
    prerequisiteIds: [],
    relatedIds: ["sliding-window"],
    practiceProblemIds: ["1-two-sum", "567-permutation-in-string"],
    sections: [
      {
        heading: "Counting with a map",
        paragraphs: [
          "Walk through the items once. For each one, add 1 to its count. Python's Counter does this for you.",
          "Two strings use the same letters exactly when their count maps are equal.",
        ],
        code: `from collections import Counter
Counter("abca")  # {'a': 2, 'b': 1, 'c': 1}`,
      },
    ],
  },
  {
    id: "permutations",
    title: "Permutations",
    summary: "A permutation is one ordering of a set of items. n different items have n! orderings, which grows very fast.",
    level: "Beginner",
    readMinutes: 4,
    published: true,
    prerequisiteIds: [],
    relatedIds: [],
    practiceProblemIds: ["567-permutation-in-string"],
    sections: [
      {
        heading: "Why n! explodes",
        paragraphs: [
          "3 items have 6 orderings. 10 items have 3,628,800. 20 items have more than 2 × 10¹⁸.",
          "If a brute-force idea tries every ordering, look for a property that ignores order, such as letter counts.",
        ],
      },
    ],
  },
  {
    id: "sorting-anagrams",
    title: "Sorting to compare anagrams",
    summary: "Two words are anagrams when they use the same letters. Sorting both and comparing is the simplest check, at O(k log k) per word.",
    level: "Beginner",
    readMinutes: 3,
    published: true,
    prerequisiteIds: [],
    relatedIds: ["hash-map"],
    practiceProblemIds: ["567-permutation-in-string"],
    sections: [
      {
        heading: "Sort, then compare",
        paragraphs: ['sorted("listen") and sorted("silent") are both [e, i, l, n, s, t], so the words are anagrams.'],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Plans and coupons (SAMPLE prices — replace before launch)
// ---------------------------------------------------------------------------

export const plans: Plan[] = [
  { id: "monthly", name: "Premium Monthly", months: 1, pricePaise: 19900, perks: [], active: true, order: 1 },
  { id: "sprint", name: "Interview Sprint", months: 3, pricePaise: 49900, perks: ["Personal 12-week interview plan"], active: true, order: 2 },
  { id: "yearly", name: "Premium Yearly", months: 12, pricePaise: 149900, perks: ["Early access to new problems"], active: true, order: 3 },
];

export const coupons: Coupon[] = [
  {
    code: "STUDENT",
    percentOff: 20,
    planIds: [],
    maxUses: 1000,
    usedCount: 0,
    validFrom: Date.UTC(2026, 0, 1),
    validUntil: Date.UTC(2027, 11, 31),
    active: true,
  },
];
