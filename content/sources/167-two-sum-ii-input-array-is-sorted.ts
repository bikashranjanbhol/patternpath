import { defineProblem } from "../../src/lib/authoring/source";

// One example for all three approaches. The answer is 4 + 6 at positions 3 and 4.
const setup = "numbers = [1, 3, 4, 6, 8, 11]\ntarget = 10";

export default defineProblem({
  problem: {
    id: "167-two-sum-ii-input-array-is-sorted",
    number: 167,
    title: "Two Sum II - Input Array Is Sorted",
    difficulty: "Medium",
    primaryPatternId: "two-pointers",
    patternIds: ["two-pointers", "binary-search"],
    ladderOrder: 2,
    description:
      "The list numbers is sorted from smallest to largest. Find the two different positions whose values add up to target. Return them counted from 1 (the first item is position 1), smaller position first. There is always exactly one answer, and you may only use a constant amount of extra memory.",
    examples: [
      {
        input: "numbers = [1, 3, 4, 6, 8, 11], target = 10",
        output: "[3, 4]",
        note: "4 + 6 = 10, at positions 3 and 4",
      },
      {
        input: "numbers = [-5, -1, 2, 7], target = 1",
        output: "[2, 3]",
        note: "Negative numbers work the same way.",
      },
    ],
    constraints: [
      "2 ≤ numbers.length ≤ 3 × 10⁴",
      "-1000 ≤ numbers[i], target ≤ 1000",
      "numbers is sorted in non-decreasing order.",
      "Exactly one pair adds up to target.",
      "Use only O(1) extra space.",
    ],
    sourceUrl:
      "https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/",
    conceptIds: ["two-pointers"],
    companyTags: ["Amazon", "Google", "Meta", "Adobe"],
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
        "For each of the n numbers, the inner loop tries every number after it: about n²/2 sums. Only a few index variables are stored.",
      bottleneck:
        "It never uses the fact that the list is sorted, so it checks pairs that the order already rules out.",
      insight:
        "The list is sorted. Once you fix the first number, you know exactly which value you need, and a sorted list can be searched for a value in O(log n).",
      code: `def twoSum(numbers, target):
    n = len(numbers)
    for i in range(n):
        for j in range(i + 1, n):
            if numbers[i] + numbers[j] == target:
                return [i + 1, j + 1]
    return []`,
      recording: {
        setup,
        call: "twoSum(numbers, target)",
        trackVar: "numbers",
        leftVar: "i",
        rightVar: "j",
        pointerMode: "pair",
        hiddenVars: ["numbers", "target"],
      },
      notes: [
        "n = 6 numbers. The plan: try every pair (i, j) with i before j.",
        "i = 0: the value 1.",
        "j = 1: the value 3.",
        "1 + 3 = 4. Not 10.",
        "j = 2: the value 4.",
        "1 + 4 = 5. Not 10.",
        "j = 3: the value 6.",
        "1 + 6 = 7. Not 10.",
        "j = 4: the value 8.",
        "1 + 8 = 9. Not 10.",
        "j = 5: the value 11.",
        "1 + 11 = 12. Not 10. Every pair with 1 has failed.",
        "i = 1: the value 3. j starts again right after i.",
        "j = 2: the value 4.",
        "3 + 4 = 7. Not 10.",
        "j = 3: the value 6.",
        "3 + 6 = 9. Not 10.",
        "j = 4: the value 8.",
        "3 + 8 = 11. Not 10.",
        "j = 5: the value 11.",
        "3 + 11 = 14. Not 10. It kept going after the sums passed 10, even though in a sorted list they could only grow.",
        "i = 2: the value 4.",
        "j = 3: the value 6.",
        "4 + 6 = 10. Found it!",
        "Return [3, 4]. The answer counts positions from 1, so add 1 to each index. That took 10 sums here.",
      ],
    },
    {
      id: "binary-search",
      name: "Fix one, binary search the other",
      kind: "better",
      tier: "premium",
      time: "O(n log n)",
      space: "O(1)",
      complexityWhy:
        "For each of the n numbers, a binary search over the rest takes O(log n) steps. It only keeps a few index variables.",
      bottleneck:
        "Every new first number starts a fresh search from scratch, even though the previous searches already told you a lot.",
      insight:
        "Look at the smallest and largest values together. If their sum is too small, the smallest value can't be in the answer; if it's too big, the largest can't. One sum rules out one value, so two pointers finish in O(n).",
      code: `def twoSum(numbers, target):
    for i in range(len(numbers)):
        need = target - numbers[i]
        lo, hi = i + 1, len(numbers) - 1
        while lo <= hi:
            mid = (lo + hi) // 2
            if numbers[mid] == need:
                return [i + 1, mid + 1]
            if numbers[mid] < need:
                lo = mid + 1
            else:
                hi = mid - 1
    return []`,
      recording: {
        setup,
        call: "twoSum(numbers, target)",
        trackVar: "numbers",
        leftVar: "lo",
        rightVar: "hi",
        pointerMode: "window",
        hiddenVars: ["numbers", "target"],
      },
      notes: [
        "i = 0: fix the first number, 1.",
        "It needs a partner of 10 − 1 = 9.",
        "Search for 9 only after i: indexes lo = 1 to hi = 5.",
        "lo ≤ hi: the range isn't empty yet.",
        "Look in the middle: mid = (1 + 5) // 2 = 3, the value 6.",
        "6 is not 9.",
        "6 is less than 9, so 9 can only be to the right of mid.",
        "Throw away the left half: lo = 4.",
        "lo ≤ hi: keep searching indexes 4 to 5.",
        "mid = (4 + 5) // 2 = 4, the value 8.",
        "8 is not 9.",
        "8 is less than 9: go right.",
        "lo = 5.",
        "lo ≤ hi: one cell left.",
        "mid = 5, the value 11.",
        "11 is not 9.",
        "11 is not less than 9.",
        "So 9 could only be to the left: hi = 4.",
        "lo > hi: the range is empty. There is no 9, so 1 is not in the answer.",
        "i = 1: fix the value 3.",
        "It needs 10 − 3 = 7.",
        "Search indexes 2 to 5 for 7.",
        "lo ≤ hi: keep searching.",
        "mid = (2 + 5) // 2 = 3, the value 6.",
        "6 is not 7.",
        "6 is less than 7: go right.",
        "lo = 4.",
        "lo ≤ hi: search indexes 4 to 5.",
        "mid = (4 + 5) // 2 = 4, the value 8.",
        "8 is not 7.",
        "8 is not less than 7.",
        "Go left: hi = 3.",
        "lo > hi: empty. There is no 7, so 3 is not in the answer.",
        "i = 2: fix the value 4.",
        "It needs 10 − 4 = 6.",
        "Search indexes 3 to 5 for 6.",
        "lo ≤ hi: keep searching.",
        "mid = (3 + 5) // 2 = 4, the value 8.",
        "8 is not 6.",
        "8 is not less than 6.",
        "Go left: hi = 3.",
        "lo ≤ hi: one cell left.",
        "mid = 3, the value 6.",
        "6 is exactly what we need.",
        "Return [3, 4]: indexes 2 and 3, counted from 1. Each search halves its range, so it takes O(log n) looks instead of n.",
      ],
    },
    {
      id: "two-pointers",
      name: "Two pointers from both ends",
      kind: "optimal",
      tier: "premium",
      time: "O(n)",
      space: "O(1)",
      complexityWhy:
        "Every pass of the loop moves left right or right left by one, and they stop when they meet: at most n − 1 moves. Only two indexes are stored.",
      bottleneck: "",
      insight:
        "This is the same walk as the sort-then-two-pointers idea for Two Sum, minus the sort. A hash map would also be O(n), but it uses O(n) memory, which this problem doesn't allow.",
      code: `def twoSum(numbers, target):
    left, right = 0, len(numbers) - 1
    while left < right:
        total = numbers[left] + numbers[right]
        if total == target:
            return [left + 1, right + 1]
        if total < target:
            left += 1
        else:
            right -= 1
    return []`,
      recording: {
        setup,
        call: "twoSum(numbers, target)",
        trackVar: "numbers",
        leftVar: "left",
        rightVar: "right",
        pointerMode: "pair",
        hiddenVars: ["numbers", "target"],
      },
      notes: [
        "Put left on the smallest value (1) and right on the largest (11).",
        "left is before right, so there are pairs to try.",
        "total = 1 + 11 = 12.",
        "12 is not 10.",
        "12 is not less than 10: too big. 11 is too big even with the smallest value, 1. Drop 11.",
        "right moves to 8. The value 11 is ruled out.",
        "left is still before right: keep going.",
        "total = 1 + 8 = 9.",
        "9 is not 10.",
        "9 is less than 10: too small. 8 is now the largest value left, so 1 can never reach 10. Drop 1.",
        "left moves to 3.",
        "Keep going.",
        "total = 3 + 8 = 11.",
        "11 is not 10.",
        "11 is not less than 10: too big. Drop 8.",
        "right moves to 6.",
        "Keep going.",
        "total = 3 + 6 = 9.",
        "9 is not 10.",
        "9 is less than 10: too small. Drop 3.",
        "left moves to 4.",
        "Keep going.",
        "total = 4 + 6 = 10.",
        "10 equals 10. Found it.",
        "Return [3, 4], counted from 1. 5 sums instead of 10, and no extra memory.",
      ],
      stepConcepts: { 5: "two-pointers", 10: "two-pointers" },
    },
  ],
});
