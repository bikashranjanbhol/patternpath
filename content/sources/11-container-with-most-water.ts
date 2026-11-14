import { defineProblem } from "../../src/lib/authoring/source";

// Best container: the lines at index 1 (height 6) and index 4 (height 4): min(6, 4) × 3 = 12.
const setup = "height = [2, 6, 3, 5, 4, 1]";

export default defineProblem({
  problem: {
    id: "11-container-with-most-water",
    number: 11,
    title: "Container With Most Water",
    difficulty: "Medium",
    primaryPatternId: "two-pointers",
    patternIds: ["two-pointers"],
    ladderOrder: 5,
    description:
      "Each value in height is a vertical line standing at that position. Pick two lines: together with the floor they form a container. Water fills it up to the shorter of the two lines, and its width is the distance between them. Return the largest amount of water a container can hold. The container can't be tilted.",
    examples: [
      { input: "height = [2, 6, 3, 5, 4, 1]", output: "12", note: "Lines at index 1 and 4: min(6, 4) × (4 − 1) = 12." },
      { input: "height = [1, 1]", output: "1" },
    ],
    constraints: ["2 ≤ height.length ≤ 10⁵", "0 ≤ height[i] ≤ 10⁴"],
    sourceUrl: "https://leetcode.com/problems/container-with-most-water/",
    conceptIds: ["two-pointers"],
    companyTags: ["Amazon", "Google", "Meta", "Microsoft", "Bloomberg"],
    published: true,
  },
  solutions: [
    {
      id: "brute-force",
      name: "Try every pair of lines",
      kind: "brute",
      tier: "free",
      time: "O(n²)",
      space: "O(1)",
      complexityWhy: "Two nested loops measure all n(n − 1)/2 pairs of lines. Only the best area so far is stored.",
      bottleneck: "It measures many containers that can't possibly win: narrower ones still capped by the same short line.",
      insight:
        "Start with the widest container: the two outer lines. Moving inward always loses width, so the only way to do better is a taller short side. Moving the taller line can't help, because the shorter one still caps the water. So always move the shorter line.",
      code: `def maxArea(height):
    best = 0
    for i in range(len(height)):
        for j in range(i + 1, len(height)):
            best = max(best, min(height[i], height[j]) * (j - i))
    return best`,
      recording: {
        setup,
        call: "maxArea(height)",
        trackVar: "height",
        leftVar: "i",
        rightVar: "j",
        pointerMode: "pair",
        hiddenVars: ["height"],
      },
      notes: [
        "best = 0: no container measured yet.",
        "i = 0: the line of height 2.",
        "j = 1: height 6.",
        "Water = min(2, 6) × (1 − 0) = 2. Best so far: 2.",
        "j = 2: height 3.",
        "min(2, 3) × 2 = 4. Best: 4.",
        "j = 3: height 5.",
        "min(2, 5) × 3 = 6. Best: 6.",
        "j = 4: height 4.",
        "min(2, 4) × 4 = 8. Best: 8.",
        "j = 5: height 1.",
        "min(2, 1) × 5 = 5. Less than 8, so best stays 8.",
        "i = 1: height 6.",
        "j = 2: height 3.",
        "min(6, 3) × 1 = 3. Best stays 8.",
        "j = 3: height 5.",
        "min(6, 5) × 2 = 10. New best: 10.",
        "j = 4: height 4.",
        "min(6, 4) × 3 = 12. New best: 12.",
        "j = 5: height 1.",
        "min(6, 1) × 4 = 4. Best stays 12.",
        "i = 2: height 3.",
        "j = 3: height 5.",
        "min(3, 5) × 1 = 3.",
        "j = 4: height 4.",
        "min(3, 4) × 2 = 6.",
        "j = 5: height 1.",
        "min(3, 1) × 3 = 3.",
        "i = 3: height 5.",
        "j = 4: height 4.",
        "min(5, 4) × 1 = 4.",
        "j = 5: height 1.",
        "min(5, 1) × 2 = 2.",
        "i = 4: height 4.",
        "j = 5: height 1.",
        "min(4, 1) × 1 = 1.",
        "i = 5: there is no line after it.",
        "Return 12. That took 15 measurements. With n lines it's n(n − 1)/2."
      ],
    },
    {
      id: "two-pointers",
      name: "Two pointers: move the shorter line",
      kind: "optimal",
      tier: "premium",
      time: "O(n)",
      space: "O(1)",
      complexityWhy:
        "Every pass of the loop moves one pointer inward by one, and they stop when they meet: at most n − 1 passes. Only a few numbers are stored.",
      bottleneck: "",
      insight:
        "Why dropping the shorter line is safe: every container that uses it with a line further in is narrower and still capped by that short line, so none of them can beat the one you just measured.",
      code: `def maxArea(height):
    left, right = 0, len(height) - 1
    best = 0
    while left < right:
        width = right - left
        area = min(height[left], height[right]) * width
        best = max(best, area)
        if height[left] < height[right]:
            left += 1
        else:
            right -= 1
    return best`,
      recording: {
        setup,
        call: "maxArea(height)",
        trackVar: "height",
        leftVar: "left",
        rightVar: "right",
        pointerMode: "pair",
        hiddenVars: ["height"],
      },
      notes: [
        "Start with the widest container: left on the first line (height 2), right on the last (height 1).",
        "best = 0 so far.",
        "left is before right: measure.",
        "width = 5 − 0 = 5.",
        "Water = min(2, 1) × 5 = 5. The shorter line, 1, caps it.",
        "Best so far: 5.",
        "Is the left line (2) shorter than the right (1)? No: the right line is the shorter one.",
        "Drop the right line. Any container with it would be narrower and still capped at 1, so none can beat 5.",
        "left is before right: measure again.",
        "width = 4.",
        "min(2, 4) × 4 = 8.",
        "New best: 8.",
        "The left line (2) is shorter than the right (4).",
        "Drop the left line: with anything closer it can't beat 8.",
        "Keep going.",
        "width = 3.",
        "min(6, 4) × 3 = 12.",
        "New best: 12.",
        "The left line (6) is not shorter than the right (4).",
        "Drop the right line.",
        "Keep going.",
        "width = 2.",
        "min(6, 5) × 2 = 10.",
        "Best stays 12.",
        "The left line (6) is not shorter than the right (5).",
        "Drop the right line.",
        "Keep going.",
        "width = 1.",
        "min(6, 3) × 1 = 3.",
        "Best stays 12.",
        "The left line (6) is not shorter than the right (3).",
        "Drop the right line. Now left and right meet.",
        "left is no longer before right: done.",
        "Return 12, after 5 measurements instead of 15."
      ],
      stepConcepts: { 8: "two-pointers" },
    },
  ],
});
