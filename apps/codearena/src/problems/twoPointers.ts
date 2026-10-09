import { range } from './helpers.ts'
import type { Problem } from './types.ts'

export const twoPointers: Problem[] = [
  {
    id: 6,
    slug: 'valid-palindrome',
    title: 'Valid Palindrome',
    difficulty: 'Easy',
    tags: ['String', 'Two Pointers'],
    description: [
      'A phrase is a **palindrome** if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward. Alphanumeric characters include letters and numbers.',
      'Given a string `s`, return `true` *if it is a palindrome, or* `false` *otherwise*.',
    ],
    functionName: 'isPalindrome',
    params: [{ name: 's', type: 'string' }],
    returns: 'boolean',
    comparator: { kind: 'exact' },
    constraints: ['1 ≤ s.length ≤ 2 × 10⁵', '`s` consists only of printable ASCII characters.'],
    tests: [
      { input: ['A man, a plan, a canal: Panama'], expected: true, explanation: '"amanaplanacanalpanama" is a palindrome.' },
      { input: ['race a car'], expected: false, explanation: '"raceacar" is not a palindrome.' },
      { input: [' '], expected: true, explanation: 'After removing non-alphanumeric characters the string is empty, which reads the same both ways.' },
      { input: ['0P'], expected: false, hidden: true },
      { input: ['ab_a'], expected: true, hidden: true },
      { input: ["No 'x' in Nixon"], expected: true, hidden: true },
      { input: ['.,!'], expected: true, hidden: true },
      { input: ['abcda'], expected: false, hidden: true },
      { input: [`${'ab'.repeat(50_000)}a`], expected: true, hidden: true },
    ],
    hints: [
      'Comparing against a cleaned, reversed copy works but allocates O(n) memory.',
      'Use two pointers, one at each end, moving toward each other.',
      'Skip characters that are not letters or digits, and compare the rest case-insensitively.',
    ],
    solution: {
      approach: [
        '**Two pointers from both ends.** `left` starts at the beginning and `right` at the end.',
        'Whenever a pointer sits on a non-alphanumeric character, move it inward. Otherwise compare the two characters in lowercase: a mismatch means the string is not a palindrome. When the pointers meet, every pair matched.',
      ],
      code: `function isPalindrome(s) {
  const isAlphanumeric = (ch) => /[a-z0-9]/i.test(ch);
  let left = 0;
  let right = s.length - 1;
  while (left < right) {
    if (!isAlphanumeric(s[left])) {
      left++;
    } else if (!isAlphanumeric(s[right])) {
      right--;
    } else {
      if (s[left].toLowerCase() !== s[right].toLowerCase()) return false;
      left++;
      right--;
    }
  }
  return true;
}`,
      time: 'O(n)',
      space: 'O(1)',
    },
  },
  {
    id: 7,
    slug: '3sum',
    title: '3Sum',
    difficulty: 'Medium',
    tags: ['Array', 'Two Pointers'],
    description: [
      'Given an integer array `nums`, return all the triplets `[nums[i], nums[j], nums[k]]` such that `i`, `j` and `k` are distinct indices and `nums[i] + nums[j] + nums[k] == 0`.',
      'The solution set **must not contain duplicate triplets**. The order of the triplets, and of the numbers inside each triplet, does not matter.',
    ],
    functionName: 'threeSum',
    params: [{ name: 'nums', type: 'number[]' }],
    returns: 'number[][]',
    comparator: { kind: 'unordered', deep: true },
    constraints: ['3 ≤ nums.length ≤ 3000', '-10⁵ ≤ nums[i] ≤ 10⁵'],
    tests: [
      {
        input: [[-1, 0, 1, 2, -1, -4]],
        expected: [[-1, -1, 2], [-1, 0, 1]],
        explanation: 'The distinct triplets that sum to zero are [-1,0,1] and [-1,-1,2].',
      },
      { input: [[0, 1, 1]], expected: [], explanation: 'The only possible triplet does not sum up to 0.' },
      { input: [[0, 0, 0]], expected: [[0, 0, 0]] },
      { input: [[-2, 0, 1, 1, 2]], expected: [[-2, 0, 2], [-2, 1, 1]], hidden: true },
      { input: [[1, 2, -2, -1]], expected: [], hidden: true },
      {
        input: [[-4, -2, -2, -2, 0, 1, 2, 2, 2, 3, 3, 4, 4, 6, 6]],
        expected: [[-4, -2, 6], [-4, 0, 4], [-4, 1, 3], [-4, 2, 2], [-2, -2, 4], [-2, 0, 2]],
        hidden: true,
      },
      { input: [[0, 0, 0, 0]], expected: [[0, 0, 0]], hidden: true },
      { input: [[3, -2, 1, 0]], expected: [], hidden: true },
      { input: [[-1, 0, 1, 0]], expected: [[-1, 0, 1]], hidden: true },
    ],
    hints: [
      'Fix one number `a`. The problem reduces to finding pairs that sum to `-a`.',
      'Sort the array first: in a sorted array, pairs with a given sum can be found with two pointers moving inward.',
      'To avoid duplicate triplets, skip equal values for the fixed number, and after each match move both pointers past repeated values.',
    ],
    solution: {
      approach: [
        '**Sort + two pointers.** After sorting, fix `nums[i]` as the smallest member of the triplet and search the rest of the array for a pair summing to `-nums[i]`.',
        'With `lo` just after `i` and `hi` at the end: if the sum is too small move `lo` right, if too large move `hi` left. Sorting also makes duplicates adjacent, so skipping equal neighbours removes duplicate triplets without a set.',
        'Once `nums[i] > 0` no triplet can sum to zero, so the loop can stop early.',
      ],
      code: `function threeSum(nums) {
  const sorted = [...nums].sort((a, b) => a - b);
  const result = [];
  for (let i = 0; i < sorted.length - 2 && sorted[i] <= 0; i++) {
    if (i > 0 && sorted[i] === sorted[i - 1]) continue;
    let lo = i + 1;
    let hi = sorted.length - 1;
    while (lo < hi) {
      const sum = sorted[i] + sorted[lo] + sorted[hi];
      if (sum < 0) {
        lo++;
      } else if (sum > 0) {
        hi--;
      } else {
        result.push([sorted[i], sorted[lo], sorted[hi]]);
        while (lo < hi && sorted[lo] === sorted[lo + 1]) lo++;
        while (lo < hi && sorted[hi] === sorted[hi - 1]) hi--;
        lo++;
        hi--;
      }
    }
  }
  return result;
}`,
      time: 'O(n²)',
      space: 'O(n) for the sorted copy',
    },
  },
  {
    id: 8,
    slug: 'container-with-most-water',
    title: 'Container With Most Water',
    difficulty: 'Medium',
    tags: ['Array', 'Two Pointers', 'Greedy'],
    description: [
      'You are given an integer array `height` of length `n`. There are `n` vertical lines drawn such that the two endpoints of the `i`-th line are `(i, 0)` and `(i, height[i])`.',
      'Find two lines that, together with the x-axis, form a container that holds the most water. Return *the maximum amount of water a container can store*.',
      '**Notice** that you may not slant the container.',
    ],
    functionName: 'maxArea',
    params: [{ name: 'height', type: 'number[]' }],
    returns: 'number',
    comparator: { kind: 'exact' },
    constraints: ['n == height.length', '2 ≤ n ≤ 10⁵', '0 ≤ height[i] ≤ 10⁴'],
    tests: [
      {
        input: [[1, 8, 6, 2, 5, 4, 8, 3, 7]],
        expected: 49,
        explanation: 'The lines at index 1 (height 8) and index 8 (height 7) are 7 apart, holding min(8, 7) × 7 = 49.',
      },
      { input: [[1, 1]], expected: 1 },
      { input: [[4, 3, 2, 1, 4]], expected: 16 },
      { input: [[1, 2, 1]], expected: 2, hidden: true },
      { input: [[2, 3, 4, 5, 18, 17, 6]], expected: 17, hidden: true },
      { input: [[0, 0]], expected: 0, hidden: true },
      { input: [[1, 3, 2, 5, 25, 24, 5]], expected: 24, hidden: true },
      { input: [range(10_000, (i) => i + 1)], expected: 25_000_000, hidden: true },
    ],
    hints: [
      'The area between lines `i` and `j` is `min(height[i], height[j]) * (j - i)`.',
      'Start with the widest container — both ends. Which pointer is worth moving?',
      'Always move the pointer at the shorter line. Moving the taller one can only shrink the width without raising the limiting height.',
    ],
    solution: {
      approach: [
        '**Greedy two pointers.** Begin with the widest container and move inward.',
        'The shorter line limits the water level. Any container that keeps the shorter line and moves the other pointer inward is narrower and no taller, so it can never be better. That lets us discard the shorter line safely at every step, giving a single linear pass.',
      ],
      code: `function maxArea(height) {
  let left = 0;
  let right = height.length - 1;
  let best = 0;
  while (left < right) {
    const area = Math.min(height[left], height[right]) * (right - left);
    best = Math.max(best, area);
    if (height[left] < height[right]) left++;
    else right--;
  }
  return best;
}`,
      time: 'O(n)',
      space: 'O(1)',
    },
  },
  {
    id: 9,
    slug: 'trapping-rain-water',
    title: 'Trapping Rain Water',
    difficulty: 'Hard',
    tags: ['Array', 'Two Pointers', 'Stack', 'Dynamic Programming'],
    description: [
      'Given `n` non-negative integers representing an elevation map where the width of each bar is `1`, compute how much water it can trap after raining.',
    ],
    functionName: 'trap',
    params: [{ name: 'height', type: 'number[]' }],
    returns: 'number',
    comparator: { kind: 'exact' },
    constraints: ['n == height.length', '1 ≤ n ≤ 2 × 10⁴', '0 ≤ height[i] ≤ 10⁵'],
    tests: [
      {
        input: [[0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]],
        expected: 6,
        explanation: 'Water collects in the dips between the bars: 1 + 1 + 2 + 1 + 1 = 6 units.',
      },
      { input: [[4, 2, 0, 3, 2, 5]], expected: 9 },
      { input: [[2, 0, 2]], expected: 2 },
      { input: [[5]], expected: 0, hidden: true },
      { input: [[1, 2, 3, 4, 5]], expected: 0, hidden: true },
      { input: [[5, 4, 3, 2, 1]], expected: 0, hidden: true },
      { input: [[5, 0, 0, 0, 5]], expected: 15, hidden: true },
      { input: [[3, 0, 1, 0, 2, 0, 4]], expected: 12, hidden: true },
      { input: [[0, 7, 1, 4, 6]], expected: 7, hidden: true },
      { input: [range(10_000, (i) => (i === 0 || i === 9_999 ? 10_000 : 0))], expected: 99_980_000, hidden: true },
    ],
    hints: [
      'The water above bar `i` is `min(maxLeft[i], maxRight[i]) - height[i]`.',
      'Precomputing `maxLeft` and `maxRight` arrays gives an O(n) time, O(n) space solution.',
      'With two pointers you only need running maxima: always process the side whose running maximum is smaller, because that side\'s water level is already decided.',
    ],
    solution: {
      approach: [
        '**Two pointers with running maxima.** Water above a bar is bounded by the tallest bar on each side; the lower of the two decides the level.',
        'Keep `leftMax` and `rightMax`. If `height[left] < height[right]`, there is a bar on the right at least as tall as anything we could need, so the water at `left` depends only on `leftMax` — settle it and advance. Otherwise do the same from the right.',
        'This replaces the two O(n) helper arrays of the DP approach with two variables.',
      ],
      code: `function trap(height) {
  let left = 0;
  let right = height.length - 1;
  let leftMax = 0;
  let rightMax = 0;
  let water = 0;
  while (left < right) {
    if (height[left] < height[right]) {
      leftMax = Math.max(leftMax, height[left]);
      water += leftMax - height[left];
      left++;
    } else {
      rightMax = Math.max(rightMax, height[right]);
      water += rightMax - height[right];
      right--;
    }
  }
  return water;
}`,
      time: 'O(n)',
      space: 'O(1)',
    },
  },
]
