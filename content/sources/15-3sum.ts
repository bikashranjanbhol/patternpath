import { defineProblem } from "../../src/lib/authoring/source";

// Sorted, this is [-1, -1, 0, 1, 2]. Two triplets add up to 0: [-1, -1, 2] and [-1, 0, 1].
// [-1, 0, 1] can be built from either -1, which shows why duplicates need care.
const setup = "nums = [-1, 2, -1, 0, 1]";

export default defineProblem({
  problem: {
    id: "15-3sum",
    number: 15,
    title: "3Sum",
    difficulty: "Medium",
    primaryPatternId: "two-pointers",
    patternIds: ["two-pointers", "hashing"],
    ladderOrder: 4,
    description:
      "Given a list of integers nums, find every group of three numbers at three different positions that adds up to 0. Return the groups as lists of values. Each group of values may appear only once in the answer, even if it can be built from different positions. The order of the groups, and of the values inside a group, doesn't matter.",
    examples: [
      { input: "nums = [-1, 2, -1, 0, 1]", output: "[[-1, -1, 2], [-1, 0, 1]]", note: "[-1, 0, 1] can use either -1, but it is listed once." },
      { input: "nums = [1, 2, 3]", output: "[]", note: "No three numbers add up to 0." },
      { input: "nums = [0, 0, 0, 0]", output: "[[0, 0, 0]]" },
    ],
    constraints: ["3 ≤ nums.length ≤ 3000", "-10⁵ ≤ nums[i] ≤ 10⁵"],
    sourceUrl: "https://leetcode.com/problems/3sum/",
    conceptIds: ["two-pointers", "hash-map"],
    companyTags: ["Meta", "Amazon", "Google", "Microsoft", "Bloomberg"],
    published: true,
  },
  solutions: [
    {
      id: "brute-force",
      name: "Check every triplet",
      kind: "brute",
      tier: "free",
      time: "O(n³)",
      space: "O(k)",
      complexityWhy:
        "Three nested loops try every group of three positions: about n³/6 groups. The set holds the k distinct answers.",
      bottleneck: "For each pair (i, j), the innermost loop searches every remaining number for the one value that would make 0.",
      insight:
        "Once i and j are fixed, the third number has to be exactly −(nums[i] + nums[j]). Remembering the numbers you've passed in a set finds it in O(1), which removes the third loop.",
      code: `def threeSum(nums):
    n = len(nums)
    found = set()
    for i in range(n):
        for j in range(i + 1, n):
            for k in range(j + 1, n):
                if nums[i] + nums[j] + nums[k] == 0:
                    found.add(tuple(sorted([nums[i], nums[j], nums[k]])))
    return sorted(list(t) for t in found)`,
      recording: {
        setup,
        call: "threeSum(nums)",
        trackVar: "nums",
        markVars: ["i", "j", "k"],
        hiddenVars: ["nums"],
      },
      notes: [
        "n = 5 numbers. The plan: try every group of three positions i < j < k.",
        "found is a set, so the same values can only be stored once.",
        "i = 0: the value -1.",
        "j = 1: the value 2.",
        "k = 2: the value -1.",
        "-1 + 2 + (-1) = 0. A match!",
        "Sort it to (-1, -1, 2) before storing, so the same values in a different order count as the same triplet.",
        "k = 3: the value 0.",
        "-1 + 2 + 0 = 1. Not 0.",
        "k = 4: the value 1.",
        "-1 + 2 + 1 = 2. Not 0.",
        "j = 2: the value -1.",
        "k = 3: the value 0.",
        "-1 + (-1) + 0 = -2. Not 0.",
        "k = 4: the value 1.",
        "-1 + (-1) + 1 = -1. Not 0.",
        "j = 3: the value 0.",
        "k = 4: the value 1.",
        "-1 + 0 + 1 = 0. A match!",
        "Store (-1, 0, 1).",
        "j = 4: there is no position left for k after it.",
        "i = 1: the value 2.",
        "j = 2: the value -1.",
        "k = 3: the value 0.",
        "2 + (-1) + 0 = 1. Not 0.",
        "k = 4: the value 1.",
        "2 + (-1) + 1 = 2. Not 0.",
        "j = 3: the value 0.",
        "k = 4: the value 1.",
        "2 + 0 + 1 = 3. Not 0.",
        "j = 4: no position left for k.",
        "i = 2: the second -1.",
        "j = 3: the value 0.",
        "k = 4: the value 1.",
        "-1 + 0 + 1 = 0 again, this time using the other -1.",
        "It sorts to (-1, 0, 1), which the set already has, so nothing new is stored. That is how the duplicate is avoided.",
        "j = 4: no position left for k.",
        "i = 3: the value 0.",
        "j = 4: no position left for k.",
        "i = 4: nothing comes after it.",
        "Return the 2 triplets: [-1, -1, 2] and [-1, 0, 1]. That was 10 groups of three. With n numbers it's about n³/6."
      ],
    },
    {
      id: "hash-set",
      name: "Fix one, two-sum with a set",
      kind: "better",
      tier: "premium",
      time: "O(n²)",
      space: "O(n)",
      complexityWhy:
        "Two nested loops over n numbers, each doing an O(1) set lookup: O(n²). The set of seen numbers holds up to n values.",
      bottleneck:
        "It needs a new set for every i, plus a second set to throw away duplicate triplets afterwards.",
      insight:
        "Sort the numbers first. Then, for each fixed i, the other two can be found with two pointers that move toward each other, and equal values sit side by side, so duplicates are easy to skip without any set.",
      code: `def threeSum(nums):
    found = set()
    for i in range(len(nums)):
        seen = set()
        for j in range(i + 1, len(nums)):
            need = -nums[i] - nums[j]
            if need in seen:
                found.add(tuple(sorted([nums[i], nums[j], need])))
            seen.add(nums[j])
    return sorted(list(t) for t in found)`,
      recording: {
        setup,
        call: "threeSum(nums)",
        trackVar: "nums",
        markVars: ["i", "j"],
        hiddenVars: ["nums"],
      },
      notes: [
        "found collects triplets as sorted tuples, so duplicates collapse into one.",
        "i = 0: fix the value -1. Now we need two numbers after it that add up to 1.",
        "Start an empty set for the numbers we pass in this round.",
        "j = 1: the value 2.",
        "The third number would have to be -(-1) - 2 = -1.",
        "Have we seen -1 in this round? No.",
        "Remember 2.",
        "j = 2: the value -1.",
        "It needs -(-1) - (-1) = 2.",
        "Have we seen 2? Yes!",
        "Store (-1, -1, 2).",
        "Remember -1.",
        "j = 3: the value 0.",
        "It needs 1.",
        "Seen 1? No.",
        "Remember 0.",
        "j = 4: the value 1.",
        "It needs 0.",
        "Seen 0? Yes!",
        "Store (-1, 0, 1).",
        "Remember 1.",
        "i = 1: fix the value 2. The other two must add up to -2.",
        "A fresh set for this round.",
        "j = 2: the value -1.",
        "It needs -2 - (-1) = -1.",
        "Seen -1? Not in this round.",
        "Remember -1.",
        "j = 3: the value 0.",
        "It needs -2.",
        "Seen -2? No.",
        "Remember 0.",
        "j = 4: the value 1.",
        "It needs -3.",
        "Seen -3? No.",
        "Remember 1.",
        "i = 2: fix the second -1. The other two must add up to 1.",
        "A fresh set.",
        "j = 3: the value 0.",
        "It needs 1.",
        "Seen 1? No.",
        "Remember 0.",
        "j = 4: the value 1.",
        "It needs 0.",
        "Seen 0? Yes.",
        "(-1, 0, 1) is already stored, so the set ignores it.",
        "Remember 1.",
        "i = 3: fix 0. The other two must add up to 0.",
        "A fresh set.",
        "j = 4: the value 1.",
        "It needs -1.",
        "Seen -1? No.",
        "Remember 1.",
        "i = 4: nothing comes after it.",
        "A fresh set, but there is no j to try.",
        "Return [[-1, -1, 2], [-1, 0, 1]]. Two loops instead of three: O(n²)."
      ],
      stepConcepts: { 6: "hash-map" },
    },
    {
      id: "sort-two-pointers",
      name: "Sort, fix one, two pointers",
      kind: "optimal",
      tier: "premium",
      time: "O(n²)",
      space: "O(1)",
      complexityWhy:
        "Sorting is O(n log n). Then for each of the n fixed numbers, left and right meet after at most n moves: O(n²) in total. Apart from the answer and the sort, it only keeps a few indexes.",
      bottleneck: "",
      insight:
        "This is Two Sum II (#167) run once for every fixed number, with target −nums[i]. O(n²) is the best known for 3Sum in practice.",
      code: `def threeSum(nums):
    nums.sort()
    result = []
    for i in range(len(nums) - 2):
        if i > 0 and nums[i] == nums[i - 1]:
            continue
        left, right = i + 1, len(nums) - 1
        while left < right:
            total = nums[i] + nums[left] + nums[right]
            if total < 0:
                left += 1
            elif total > 0:
                right -= 1
            else:
                result.append([nums[i], nums[left], nums[right]])
                left += 1
                right -= 1
                while left < right and nums[left] == nums[left - 1]:
                    left += 1
    return result`,
      recording: {
        setup,
        call: "threeSum(nums)",
        trackVar: "nums",
        leftVar: "left",
        rightVar: "right",
        pointerMode: "pair",
        markVars: ["i"],
        hiddenVars: ["nums"],
      },
      notes: [
        "Sort first: [-1, -1, 0, 1, 2]. Equal values now sit next to each other.",
        "result will hold the answer.",
        "i = 0: fix -1. We need two numbers after it that add up to 1.",
        "i is the first position, so it can't be a repeat.",
        "left starts right after i (index 1), right at the end (index 4).",
        "left is before right: search.",
        "total = -1 + (-1) + 2 = 0.",
        "0 is not less than 0.",
        "0 is not more than 0 either, so it's a match.",
        "Save [-1, -1, 2].",
        "Move left inward.",
        "Move right inward too. With one side fixed, the other has to change for a new sum.",
        "Is the new left value (0) the same as the one just used (-1)? No, so nothing to skip.",
        "left is before right: keep searching.",
        "total = -1 + 0 + 1 = 0.",
        "Not less than 0.",
        "Not more than 0: a match.",
        "Save [-1, 0, 1].",
        "Move left.",
        "Move right. They have crossed.",
        "left is past right, so there is nothing to skip.",
        "The search for i = 0 is done.",
        "i = 1: also -1.",
        "Same value as the one before it. Every triplet it could make was already found, so skip it.",
        "i = 2: fix 0. We need two numbers after it that add up to 0.",
        "Not a repeat: the one before it is -1.",
        "left = 3, right = 4.",
        "left is before right: search.",
        "total = 0 + 1 + 2 = 3.",
        "3 is not less than 0.",
        "3 is more than 0: too big. Move right inward for a smaller sum.",
        "right moves to 3.",
        "left and right met, so i = 2 is done. That was the last i with two numbers after it.",
        "Return [[-1, -1, 2], [-1, 0, 1]]. Sorting made duplicates easy to skip, so no set was needed."
      ],
      stepConcepts: { 24: "two-pointers", 31: "two-pointers" },
    },
  ],
});
