import { defineProblem } from "../../src/lib/authoring/source";

// "Top, spot!" cleans up to "topspot", which reads the same both ways.
const setup = 's = "Top, spot!"';

export default defineProblem({
  problem: {
    id: "125-valid-palindrome",
    number: 125,
    title: "Valid Palindrome",
    difficulty: "Easy",
    primaryPatternId: "two-pointers",
    patternIds: ["two-pointers"],
    ladderOrder: 3,
    description:
      "A string is a palindrome if it reads the same forwards and backwards. Here, first ignore every character that isn't a letter or a digit, and treat uppercase and lowercase as the same. Return true if what's left is a palindrome, and false if it isn't.",
    examples: [
      { input: 's = "Top, spot!"', output: "true", note: 'Cleaned up it is "topspot".' },
      { input: 's = "race a car"', output: "false", note: '"raceacar" reversed is "racaecar".' },
      { input: 's = " ,."', output: "true", note: "Nothing is left, and an empty string reads the same both ways." },
    ],
    constraints: ["1 ≤ s.length ≤ 2 × 10⁵", "s contains only printable ASCII characters."],
    sourceUrl: "https://leetcode.com/problems/valid-palindrome/",
    conceptIds: ["two-pointers"],
    companyTags: ["Meta", "Microsoft", "Amazon", "Apple"],
    published: true,
  },
  solutions: [
    {
      id: "clean-and-reverse",
      name: "Clean it, then compare with its reverse",
      kind: "brute",
      tier: "free",
      time: "O(n)",
      space: "O(n)",
      complexityWhy:
        "One pass builds the cleaned string, reversing it is another pass, and comparing is a third: O(n) in total. The cleaned copy and its reverse take O(n) extra memory.",
      bottleneck:
        "It makes two full copies of the string just to compare it with itself, and it always reads everything, even when the first and last letters already differ.",
      insight:
        "Comparing with the reverse just means comparing the first letter with the last, the second with the second-to-last, and so on. Two pointers can do that on the original string, skipping the punctuation as they go.",
      code: `def isPalindrome(s):
    cleaned = ""
    for i, ch in enumerate(s):
        if ch.isalnum():
            cleaned += ch.lower()
    return cleaned == cleaned[::-1]`,
      recording: {
        setup,
        call: "isPalindrome(s)",
        trackVar: "s",
        indexVar: "i",
        hiddenVars: ["s"],
      },
      notes: [
        "Start with an empty string. We will copy only the letters and digits into it, in lowercase.",
        "i = 0: the character \"T\".",
        "\"T\" is a letter: keep it.",
        "Add it in lowercase. cleaned = \"t\".",
        "i = 1: \"o\".",
        "A letter: keep it.",
        "cleaned = \"to\".",
        "i = 2: \"p\".",
        "A letter: keep it.",
        "cleaned = \"top\".",
        "i = 3: \",\".",
        "A comma is not a letter or digit: skip it.",
        "i = 4: a space.",
        "Not a letter or digit: skip it.",
        "i = 5: \"s\".",
        "A letter: keep it.",
        "cleaned = \"tops\".",
        "i = 6: \"p\".",
        "Keep it.",
        "cleaned = \"topsp\".",
        "i = 7: \"o\".",
        "Keep it.",
        "cleaned = \"topspo\".",
        "i = 8: \"t\".",
        "Keep it.",
        "cleaned = \"topspot\".",
        "i = 9: \"!\".",
        "Not a letter or digit: skip it.",
        "Reverse \"topspot\" and you get \"topspot\" again, so return True. It took two extra copies of the string to find out."
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
        "left only moves right and right only moves left, so together they visit each character at most once. Only two indexes are stored, no copies.",
      bottleneck: "",
      insight:
        "It stops at the first mismatch, so a string that isn't a palindrome is usually rejected after a few steps.",
      code: `def isPalindrome(s):
    left, right = 0, len(s) - 1
    while left < right:
        while left < right and not s[left].isalnum():
            left += 1
        while left < right and not s[right].isalnum():
            right -= 1
        if s[left].lower() != s[right].lower():
            return False
        left += 1
        right -= 1
    return True`,
      recording: {
        setup,
        call: "isPalindrome(s)",
        trackVar: "s",
        leftVar: "left",
        rightVar: "right",
        pointerMode: "pair",
        hiddenVars: ["s"],
      },
      notes: [
        "Put left on the first character (\"T\") and right on the last (\"!\").",
        "left is before right, so there are pairs to compare.",
        "\"T\" is a letter, so left stays where it is.",
        "\"!\" is not a letter or digit, so right has to skip it.",
        "right moves to \"t\".",
        "\"t\" is a letter, so right stops here.",
        "Compare \"T\" and \"t\" in lowercase: both are \"t\". They match.",
        "Move left inward, to \"o\".",
        "Move right inward, to \"o\". The outer pair is done.",
        "left is still before right: keep going.",
        "\"o\" is a letter: left stays.",
        "\"o\" is a letter: right stays.",
        "\"o\" and \"o\" match.",
        "left moves to \"p\".",
        "right moves to \"p\".",
        "Keep going.",
        "\"p\" is a letter: left stays.",
        "\"p\" is a letter: right stays.",
        "\"p\" and \"p\" match.",
        "left moves to \",\".",
        "right moves to \"s\".",
        "Keep going.",
        "\",\" is not a letter or digit: left skips it.",
        "left moves to the space.",
        "A space is not a letter or digit either: skip it.",
        "left moves to \"s\". Now left and right are on the same character.",
        "left is no longer before right, so the skipping stops.",
        "Same for right.",
        "A character always matches itself.",
        "left moves past the middle.",
        "right moves past it too.",
        "left is past right: every pair has been checked.",
        "No pair was different, so return True. No copies were made."
      ],
      stepConcepts: { 4: "two-pointers" },
    },
  ],
});
