import { defineProblem } from "../../src/lib/authoring/source";

// One example for all three approaches, so learners can compare them step for step.
const setup = "nums = [4, 11, 1, 7, 15]\ntarget = 18";

export default defineProblem({
  problem: {
    id: "1-two-sum",
    number: 1,
    title: "Two Sum",
    difficulty: "Easy",
    primaryPatternId: "two-pointers",
    patternIds: ["two-pointers", "hashing"],
    ladderOrder: 1,
    description:
      "You get a list of integers nums and a number target. Find the two positions whose values add up to target and return those two indexes. There is always exactly one answer, and you can't use the same position twice. Any order of the two indexes is fine.",
    examples: [
      { input: "nums = [4, 11, 1, 7, 15], target = 18", output: "[1, 3]", note: "11 + 7 = 18" },
      { input: "nums = [3, 3], target = 6", output: "[0, 1]", note: "Equal values at different positions count." },
    ],
    constraints: [
      "2 ≤ nums.length ≤ 10⁴",
      "-10⁹ ≤ nums[i], target ≤ 10⁹",
      "Exactly one pair adds up to target.",
    ],
    sourceUrl: "https://leetcode.com/problems/two-sum/",
    conceptIds: ["two-pointers", "hash-map"],
    companyTags: ["Amazon", "Google", "Microsoft", "Meta", "Apple"],
    published: true,
  },
  solutions: [
    {
      id: "brute-force",
      name: "Check every pair",
      kind: "brute",
      tier: "free",
      time: "O(n²)",
      space: "O(1)",
      complexityWhy:
        "For each of the n numbers, the inner loop tries every number after it: about n²/2 sums. Nothing extra is stored.",
      bottleneck: "Most pairs are checked even though one sum already tells you a lot about the others.",
      insight:
        "If the numbers were sorted, one sum would tell you which way to go: too small, move the left end right; too big, move the right end left.",
      code: `def twoSum(nums, target):
    n = len(nums)
    for i in range(n):
        for j in range(i + 1, n):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []`,
      recording: {
        setup,
        call: "twoSum(nums, target)",
        trackVar: "nums",
        leftVar: "i",
        rightVar: "j",
        pointerMode: "pair",
        hiddenVars: ["nums", "target"],
      },
      notes: [
        "There are n = 5 numbers. The plan: try every pair (i, j) with i before j, and check its sum.",
        "Fix the first number of the pair: i = 0, which is 4.",
        "Pair it with the next number: j = 1, which is 11.",
        "4 + 11 = 15. Not 18, keep going.",
        "Move j to 2: the value 1.",
        "4 + 1 = 5. Not 18.",
        "Move j to 3: the value 7.",
        "4 + 7 = 11. Not 18.",
        "Move j to 4: the value 15.",
        "4 + 15 = 19. Not 18. Every pair with 4 has failed, so 4 is not in the answer.",
        "Move i to 1 (the value 11). Index 0 is done. j will start again right after i.",
        "j = 2: the value 1.",
        "11 + 1 = 12. Not 18.",
        "j = 3: the value 7.",
        "11 + 7 = 18. Found it!",
        "Return [1, 3]. That took 6 sums here. With n numbers it can take about n²/2 sums.",
      ],
    },
    {
      id: "sort-two-pointers",
      name: "Sort, then two pointers",
      kind: "better",
      tier: "premium",
      time: "O(n log n)",
      space: "O(n)",
      complexityWhy:
        "Sorting takes O(n log n). The pointer walk is O(n): every step moves one pointer inward, so they meet after at most n steps. The sorted copy keeps n (value, index) pairs.",
      bottleneck: "Sorting costs O(n log n), and you have to carry each number's original index through the sort.",
      insight:
        "You never needed the order, only the answer to “have I already seen target − x?”. A hash map answers that in O(1).",
      code: `def twoSum(nums, target):
    pairs = sorted((num, i) for i, num in enumerate(nums))
    left, right = 0, len(pairs) - 1
    while left < right:
        total = pairs[left][0] + pairs[right][0]
        if total == target:
            return sorted([pairs[left][1], pairs[right][1]])
        if total < target:
            left += 1
        else:
            right -= 1
    return []`,
      recording: {
        setup,
        call: "twoSum(nums, target)",
        trackVar: "pairs",
        leftVar: "left",
        rightVar: "right",
        pointerMode: "pair",
        hiddenVars: ["nums", "target", "pairs"],
      },
      notes: [
        "Pair each number with its original index, then sort by value: (1, 2) (4, 0) (7, 3) (11, 1) (15, 4). Keep the index, because sorting moves the numbers around.",
        "Put left on the smallest value (1) and right on the largest (15).",
        "left is still before right, so there are pairs left to try.",
        "total = 1 + 15 = 16.",
        "16 is not 18.",
        "16 is less than 18: too small. 15 is the biggest value there is, so 1 can't reach 18 with anything. Drop 1.",
        "left moves to 4. The value 1 is ruled out for good.",
        "left is still before right: keep going.",
        "total = 4 + 15 = 19.",
        "19 is not 18.",
        "19 is not less than 18: too big. Even the smallest value left (4) is too much with 15. Drop 15.",
        "right moves to 11. The value 15 is ruled out.",
        "left is still before right: keep going.",
        "total = 4 + 11 = 15.",
        "15 is not 18.",
        "15 is less than 18: too small. Drop 4.",
        "left moves to 7.",
        "left is still before right: keep going.",
        "total = 7 + 11 = 18.",
        "18 equals 18. Found the pair.",
        "Read the original indexes from the pairs: 7 was at index 3 and 11 at index 1. Return [1, 3]. Every step ruled out one value, so the walk takes at most n steps.",
      ],
      stepConcepts: { 6: "two-pointers", 11: "two-pointers" },
    },
    {
      id: "hash-map",
      name: "One pass with a hash map",
      kind: "optimal",
      tier: "premium",
      time: "O(n)",
      space: "O(n)",
      complexityWhy:
        "One loop over n numbers. Each lookup and insert in the hash map takes O(1) on average. In the worst case the map holds n − 1 numbers.",
      bottleneck: "",
      insight: "",
      code: `def twoSum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        need = target - num
        if need in seen:
            return [seen[need], i]
        seen[num] = i
    return []`,
      recording: {
        setup,
        call: "twoSum(nums, target)",
        trackVar: "nums",
        indexVar: "i",
        hiddenVars: ["nums", "target"],
      },
      notes: [
        "Start an empty map. It will store each number we pass and the index where we saw it.",
        "i = 0: the number is 4.",
        "To reach 18, 4 needs a partner of 18 − 4 = 14.",
        "Have we seen 14 already? No.",
        "Remember 4 at index 0, in case a later number needs it.",
        "i = 1: the number is 11.",
        "11 needs 18 − 11 = 7.",
        "Have we seen 7? No, only 4 so far.",
        "Remember 11 at index 1.",
        "i = 2: the number is 1.",
        "1 needs 18 − 1 = 17.",
        "Have we seen 17? No.",
        "Remember 1 at index 2.",
        "i = 3: the number is 7.",
        "7 needs 18 − 7 = 11.",
        "Have we seen 11? Yes, at index 1.",
        "Return [1, 3]: 11 at index 1 plus 7 at index 3. One pass, no sorting, and one O(1) lookup per number.",
      ],
      stepConcepts: { 4: "hash-map" },
    },
  ],
});
