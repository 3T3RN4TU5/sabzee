import { range } from './helpers.ts'
import type { Problem } from './types.ts'

const oddsAroundZero = range(10_000, (i) => 2 * i - 9_999)
const rotatedLarge = range(5_000, (i) => (i + 2_500) % 5_000)

export const binarySearch: Problem[] = [
  {
    id: 16,
    slug: 'binary-search',
    title: 'Binary Search',
    difficulty: 'Easy',
    tags: ['Array', 'Binary Search'],
    description: [
      'Given an array of integers `nums` which is sorted in ascending order, and an integer `target`, write a function to search `target` in `nums`. If `target` exists, return its index. Otherwise, return `-1`.',
      'You must write an algorithm with **O(log n)** runtime complexity.',
    ],
    functionName: 'search',
    params: [
      { name: 'nums', type: 'number[]' },
      { name: 'target', type: 'number' },
    ],
    returns: 'number',
    comparator: { kind: 'exact' },
    constraints: [
      '1 ≤ nums.length ≤ 10⁴',
      '-10⁴ < nums[i], target < 10⁴',
      'All the integers in `nums` are unique.',
      '`nums` is sorted in ascending order.',
    ],
    tests: [
      { input: [[-1, 0, 3, 5, 9, 12], 9], expected: 4, explanation: '9 exists in nums and its index is 4.' },
      { input: [[-1, 0, 3, 5, 9, 12], 2], expected: -1, explanation: '2 does not exist in nums, so return -1.' },
      { input: [[5], 5], expected: 0 },
      { input: [[5], -5], expected: -1, hidden: true },
      { input: [[1, 3], 3], expected: 1, hidden: true },
      { input: [[1, 3], 1], expected: 0, hidden: true },
      { input: [[2, 4, 6, 8, 10, 12, 14], 2], expected: 0, hidden: true },
      { input: [[2, 4, 6, 8, 10, 12, 14], 14], expected: 6, hidden: true },
      { input: [[2, 4, 6, 8, 10, 12, 14], 7], expected: -1, hidden: true },
      { input: [oddsAroundZero, 1_001], expected: 5_500, hidden: true },
      { input: [oddsAroundZero, 1_000], expected: -1, hidden: true },
    ],
    hints: [
      'Compare the target with the middle element: the result tells you which half can be discarded.',
      'Keep an inclusive window `[lo, hi]` and loop while `lo <= hi`. Compute the middle as `lo + ((hi - lo) >> 1)`.',
    ],
    solution: {
      approach: [
        '**Classic binary search.** Maintain the inclusive range `[lo, hi]` that could still contain `target`.',
        'Look at the middle element: if it equals `target` we are done, if it is smaller the answer lies to the right, otherwise to the left. Each step halves the range, giving logarithmic time.',
      ],
      code: `function search(nums, target) {
  let lo = 0;
  let hi = nums.length - 1;
  while (lo <= hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}`,
      time: 'O(log n)',
      space: 'O(1)',
    },
  },
  {
    id: 17,
    slug: 'search-in-rotated-sorted-array',
    title: 'Search in Rotated Sorted Array',
    difficulty: 'Medium',
    tags: ['Array', 'Binary Search'],
    description: [
      'There is an integer array `nums` sorted in ascending order (with **distinct** values). Before being passed to your function, `nums` may have been **rotated** at an unknown pivot index `k`, so that it becomes `[nums[k], …, nums[n-1], nums[0], …, nums[k-1]]`. For example, `[0,1,2,4,5,6,7]` might become `[4,5,6,7,0,1,2]`.',
      'Given the array `nums` after the possible rotation and an integer `target`, return *the index of* `target` *if it is in* `nums`*, or* `-1` *if it is not*.',
      'You must write an algorithm with **O(log n)** runtime complexity.',
    ],
    functionName: 'search',
    params: [
      { name: 'nums', type: 'number[]' },
      { name: 'target', type: 'number' },
    ],
    returns: 'number',
    comparator: { kind: 'exact' },
    constraints: [
      '1 ≤ nums.length ≤ 5000',
      '-10⁴ ≤ nums[i] ≤ 10⁴',
      'All values of `nums` are unique.',
      '`nums` is an ascending array that is possibly rotated.',
      '-10⁴ ≤ target ≤ 10⁴',
    ],
    tests: [
      { input: [[4, 5, 6, 7, 0, 1, 2], 0], expected: 4 },
      { input: [[4, 5, 6, 7, 0, 1, 2], 3], expected: -1 },
      { input: [[1], 0], expected: -1 },
      { input: [[1], 1], expected: 0, hidden: true },
      { input: [[3, 1], 1], expected: 1, hidden: true },
      { input: [[5, 1, 3], 5], expected: 0, hidden: true },
      { input: [[6, 7, 8, 1, 2, 3, 4, 5], 8], expected: 2, hidden: true },
      { input: [[6, 7, 8, 1, 2, 3, 4, 5], 4], expected: 6, hidden: true },
      { input: [[1, 2, 3, 4, 5], 5], expected: 4, hidden: true },
      { input: [rotatedLarge, 1_234], expected: 3_734, hidden: true },
    ],
    hints: [
      'Even after rotation, at least one half around `mid` is always sorted.',
      'Find out which half is sorted by comparing `nums[lo]` with `nums[mid]`.',
      'If the target lies inside the sorted half\'s range, search there; otherwise search the other half.',
    ],
    solution: {
      approach: [
        '**Binary search on the sorted half.** Splitting a rotated array at any `mid` leaves at least one side in plain ascending order.',
        'If `nums[lo] <= nums[mid]`, the left side is sorted: when `target` falls between `nums[lo]` and `nums[mid]` search left, otherwise search right. The mirrored logic applies when the right side is sorted.',
      ],
      code: `function search(nums, target) {
  let lo = 0;
  let hi = nums.length - 1;
  while (lo <= hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (nums[mid] === target) return mid;
    if (nums[lo] <= nums[mid]) {
      // Left half [lo, mid] is sorted.
      if (nums[lo] <= target && target < nums[mid]) hi = mid - 1;
      else lo = mid + 1;
    } else {
      // Right half [mid, hi] is sorted.
      if (nums[mid] < target && target <= nums[hi]) lo = mid + 1;
      else hi = mid - 1;
    }
  }
  return -1;
}`,
      time: 'O(log n)',
      space: 'O(1)',
    },
  },
  {
    id: 18,
    slug: 'median-of-two-sorted-arrays',
    title: 'Median of Two Sorted Arrays',
    difficulty: 'Hard',
    tags: ['Array', 'Binary Search'],
    description: [
      'Given two sorted arrays `nums1` and `nums2` of size `m` and `n` respectively, return **the median** of the two sorted arrays.',
      'The overall run time complexity should be **O(log (m + n))**. Answers within 10⁻⁵ of the expected value are accepted.',
    ],
    functionName: 'findMedianSortedArrays',
    params: [
      { name: 'nums1', type: 'number[]' },
      { name: 'nums2', type: 'number[]' },
    ],
    returns: 'number',
    comparator: { kind: 'float', tolerance: 1e-5 },
    constraints: [
      'nums1.length == m, nums2.length == n',
      '0 ≤ m, n ≤ 1000',
      '1 ≤ m + n ≤ 2000',
      '-10⁶ ≤ nums1[i], nums2[i] ≤ 10⁶',
    ],
    tests: [
      { input: [[1, 3], [2]], expected: 2, explanation: 'The merged array is [1,2,3] and its median is 2.' },
      { input: [[1, 2], [3, 4]], expected: 2.5, explanation: 'The merged array is [1,2,3,4] and its median is (2 + 3) / 2 = 2.5.' },
      { input: [[0, 0], [0, 0]], expected: 0 },
      { input: [[], [1]], expected: 1, hidden: true },
      { input: [[2], []], expected: 2, hidden: true },
      { input: [[1, 3, 5, 7], [2, 4, 6, 8]], expected: 4.5, hidden: true },
      { input: [[1, 2, 3], [4, 5, 6, 7, 8]], expected: 4.5, hidden: true },
      { input: [[-5, 3, 6, 12, 15], [-12, -10, -6, -3, 4, 10]], expected: 3, hidden: true },
      { input: [[100_000], [100_001]], expected: 100_000.5, hidden: true },
      { input: [range(1_000, (i) => 2 * i), range(1_000, (i) => 2 * i + 1)], expected: 999.5, hidden: true },
    ],
    hints: [
      'Merging both arrays gives an easy O(m + n) solution. The challenge is O(log(min(m, n))).',
      'Binary search for a cut in the smaller array such that the left parts of both arrays together contain exactly half of all elements.',
      'A cut is correct when `maxLeft1 <= minRight2` and `maxLeft2 <= minRight1`. Use ±Infinity for empty sides.',
    ],
    solution: {
      approach: [
        '**Binary search on the partition.** Cutting `nums1` after `i` elements forces the cut in `nums2` to be after `j = half - i` elements, so that the two left parts hold half of everything.',
        'The cut is valid when every element on the left is ≤ every element on the right, i.e. `left1 <= right2` and `left2 <= right1`. If `left1` is too big, move `i` left; otherwise move it right.',
        'At a valid cut the median is the largest left element (odd total) or the average of the largest left and smallest right element (even total). Searching over the shorter array gives O(log(min(m, n))).',
      ],
      code: `function findMedianSortedArrays(nums1, nums2) {
  if (nums1.length > nums2.length) return findMedianSortedArrays(nums2, nums1);
  const m = nums1.length;
  const n = nums2.length;
  const half = Math.floor((m + n + 1) / 2);
  let lo = 0;
  let hi = m;
  while (lo <= hi) {
    const i = (lo + hi) >> 1; // elements taken from nums1
    const j = half - i;       // elements taken from nums2
    const left1 = i > 0 ? nums1[i - 1] : -Infinity;
    const right1 = i < m ? nums1[i] : Infinity;
    const left2 = j > 0 ? nums2[j - 1] : -Infinity;
    const right2 = j < n ? nums2[j] : Infinity;
    if (left1 <= right2 && left2 <= right1) {
      const leftMax = Math.max(left1, left2);
      if ((m + n) % 2 === 1) return leftMax;
      return (leftMax + Math.min(right1, right2)) / 2;
    }
    if (left1 > right2) hi = i - 1;
    else lo = i + 1;
  }
  throw new Error('Input arrays must be sorted');
}`,
      time: 'O(log(min(m, n)))',
      space: 'O(1)',
    },
  },
]
