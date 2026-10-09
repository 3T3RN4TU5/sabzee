import { range } from './helpers.ts'
import type { Problem } from './types.ts'

const oddNumbers = range(10_000, (i) => 2 * i + 1)
const frequencyLadder = range(200, (i) => i + 1).flatMap((value) => range(value, () => value))

export const arraysHashing: Problem[] = [
  {
    id: 1,
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    tags: ['Array', 'Hash Map'],
    description: [
      'Given an array of integers `nums` and an integer `target`, return *the indices of the two numbers that add up to `target`*.',
      'You may assume that each input has **exactly one solution**, and you may not use the same element twice.',
      'You can return the answer in any order.',
    ],
    functionName: 'twoSum',
    params: [
      { name: 'nums', type: 'number[]' },
      { name: 'target', type: 'number' },
    ],
    returns: 'number[]',
    comparator: { kind: 'unordered' },
    constraints: [
      '2 ≤ nums.length ≤ 10⁴',
      '-10⁹ ≤ nums[i] ≤ 10⁹',
      '-10⁹ ≤ target ≤ 10⁹',
      'Only one valid answer exists.',
    ],
    tests: [
      { input: [[2, 7, 11, 15], 9], expected: [0, 1], explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].' },
      { input: [[3, 2, 4], 6], expected: [1, 2] },
      { input: [[3, 3], 6], expected: [0, 1], explanation: 'Equal values are fine as long as they are different elements.' },
      { input: [[-1, -2, -3, -4, -5], -8], expected: [2, 4], hidden: true },
      { input: [[0, 4, 3, 0], 0], expected: [0, 3], hidden: true },
      { input: [[1, 5, 9, 13, 2], 3], expected: [0, 4], hidden: true },
      { input: [[1_000_000_000, 5, -999_999_998], 2], expected: [0, 2], hidden: true },
      { input: [oddNumbers, 39_996], expected: [9998, 9999], hidden: true },
    ],
    hints: [
      'The brute force checks every pair in O(n²). Can you avoid re-scanning the array for every element?',
      'For each number `x`, the partner you need is `target - x`. Which data structure answers "have I seen this value before?" in O(1)?',
      'Walk the array once and store each value\'s index in a hash map. Before storing `x`, check whether `target - x` is already there.',
    ],
    solution: {
      approach: [
        '**One-pass hash map.** While scanning, remember every value you have seen together with its index.',
        'For the current number, the complement `target - nums[i]` must have appeared earlier if a pair ends here. A `Map` lookup answers that in constant time, so the whole scan is linear.',
        'Checking *before* inserting the current value guarantees we never pair an element with itself.',
      ],
      code: `function twoSum(nums, target) {
  const seen = new Map(); // value -> index
  for (let i = 0; i < nums.length; i++) {
    const need = target - nums[i];
    if (seen.has(need)) return [seen.get(need), i];
    seen.set(nums[i], i);
  }
  return [];
}`,
      time: 'O(n)',
      space: 'O(n)',
    },
  },
  {
    id: 2,
    slug: 'valid-anagram',
    title: 'Valid Anagram',
    difficulty: 'Easy',
    tags: ['String', 'Hash Map'],
    description: [
      'Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, and `false` otherwise.',
      'An **anagram** is a word formed by rearranging the letters of another word, using every original letter exactly once.',
    ],
    functionName: 'isAnagram',
    params: [
      { name: 's', type: 'string' },
      { name: 't', type: 'string' },
    ],
    returns: 'boolean',
    comparator: { kind: 'exact' },
    constraints: ['0 ≤ s.length, t.length ≤ 5 × 10⁴', '`s` and `t` consist of lowercase English letters.'],
    tests: [
      { input: ['anagram', 'nagaram'], expected: true },
      { input: ['rat', 'car'], expected: false },
      { input: ['a', 'ab'], expected: false, explanation: 'Strings of different lengths can never be anagrams.' },
      { input: ['', ''], expected: true, hidden: true },
      { input: ['aacc', 'ccac'], expected: false, hidden: true },
      { input: ['listen', 'silent'], expected: true, hidden: true },
      { input: ['abcdefghijklmnopqrstuvwxyz', 'zyxwvutsrqponmlkjihgfedcba'], expected: true, hidden: true },
      { input: ['ab'.repeat(25_000), 'ba'.repeat(25_000)], expected: true, hidden: true },
    ],
    hints: [
      'Two strings are anagrams exactly when every character appears the same number of times in both.',
      'If the lengths differ you can return `false` immediately.',
      'Count characters of `s` up and characters of `t` down in one frequency table — 26 counters are enough for lowercase letters. Every counter must end at zero.',
    ],
    solution: {
      approach: [
        '**Frequency counting.** Anagrams have identical letter counts, so compare counts instead of permutations.',
        'A single array of 26 counters is incremented for `s` and decremented for `t` in the same loop. If any counter is non-zero at the end, some letter is over- or under-represented.',
        'Sorting both strings and comparing also works, but costs O(n log n).',
      ],
      code: `function isAnagram(s, t) {
  if (s.length !== t.length) return false;
  const counts = new Array(26).fill(0);
  for (let i = 0; i < s.length; i++) {
    counts[s.charCodeAt(i) - 97]++;
    counts[t.charCodeAt(i) - 97]--;
  }
  return counts.every((count) => count === 0);
}`,
      time: 'O(n)',
      space: 'O(1) — 26 counters',
    },
  },
  {
    id: 3,
    slug: 'group-anagrams',
    title: 'Group Anagrams',
    difficulty: 'Medium',
    tags: ['Array', 'String', 'Hash Map'],
    description: [
      'Given an array of strings `strs`, group **the anagrams** together. You can return the answer in **any order**.',
      'The order of the groups and the order of words inside a group do not matter.',
    ],
    functionName: 'groupAnagrams',
    params: [{ name: 'strs', type: 'string[]' }],
    returns: 'string[][]',
    comparator: { kind: 'unordered', deep: true },
    constraints: ['1 ≤ strs.length ≤ 10⁴', '0 ≤ strs[i].length ≤ 100', '`strs[i]` consists of lowercase English letters.'],
    tests: [
      {
        input: [['eat', 'tea', 'tan', 'ate', 'nat', 'bat']],
        expected: [['bat'], ['nat', 'tan'], ['ate', 'eat', 'tea']],
        explanation: '"bat" has no anagram partner; "nat" and "tan" form one group; "ate", "eat" and "tea" form another.',
      },
      { input: [['']], expected: [['']] },
      { input: [['a']], expected: [['a']] },
      { input: [['abc', 'bca', 'cab', 'xyz', 'zyx', 'q']], expected: [['abc', 'bca', 'cab'], ['xyz', 'zyx'], ['q']], hidden: true },
      { input: [['', '']], expected: [['', '']], hidden: true },
      { input: [['ab', 'ba', 'abc', 'cba', 'bca', 'a']], expected: [['ab', 'ba'], ['abc', 'cba', 'bca'], ['a']], hidden: true },
      { input: [['ddddddddddg', 'dgggggggggg']], expected: [['ddddddddddg'], ['dgggggggggg']], hidden: true },
      { input: [['tea', 'and', 'ate', 'eat', 'dan']], expected: [['tea', 'ate', 'eat'], ['and', 'dan']], hidden: true },
    ],
    hints: [
      'All anagrams of a word share the same *signature*. What could that signature be?',
      'Sorting the letters gives a canonical key: "eat", "tea" and "ate" all become "aet".',
      'Group words in a `Map` from key to list. For O(k) keys instead of O(k log k), build the key from a 26-letter count array.',
    ],
    solution: {
      approach: [
        '**Canonical key + hash map.** Two words are anagrams exactly when their sorted letters are equal, so the sorted word is a perfect grouping key.',
        'Append each word to the list stored under its key, then return all lists. With word length `k`, sorting each word costs O(k log k).',
      ],
      code: `function groupAnagrams(strs) {
  const groups = new Map(); // sorted letters -> words
  for (const word of strs) {
    const key = [...word].sort().join('');
    const group = groups.get(key);
    if (group) group.push(word);
    else groups.set(key, [word]);
  }
  return [...groups.values()];
}`,
      time: 'O(n · k log k)',
      space: 'O(n · k)',
    },
  },
  {
    id: 4,
    slug: 'top-k-frequent-elements',
    title: 'Top K Frequent Elements',
    difficulty: 'Medium',
    tags: ['Array', 'Hash Map'],
    description: [
      'Given an integer array `nums` and an integer `k`, return *the* `k` *most frequent elements*. You may return the answer in **any order**.',
      'It is guaranteed that the answer is unique.',
      '**Follow-up:** your algorithm\'s time complexity must be better than O(n log n).',
    ],
    functionName: 'topKFrequent',
    params: [
      { name: 'nums', type: 'number[]' },
      { name: 'k', type: 'number' },
    ],
    returns: 'number[]',
    comparator: { kind: 'unordered' },
    constraints: [
      '1 ≤ nums.length ≤ 10⁵',
      '-10⁴ ≤ nums[i] ≤ 10⁴',
      '`k` is in the range [1, number of unique elements].',
      'The answer is unique.',
    ],
    tests: [
      { input: [[1, 1, 1, 2, 2, 3], 2], expected: [1, 2] },
      { input: [[1], 1], expected: [1] },
      { input: [[4, 1, -1, 2, -1, 2, 3], 2], expected: [-1, 2], explanation: '-1 and 2 both appear twice; every other value appears once.' },
      { input: [[5, 5, 5, 5], 1], expected: [5], hidden: true },
      { input: [[1, 2, 3, 4, 5], 5], expected: [1, 2, 3, 4, 5], hidden: true },
      { input: [[3, 0, 1, 0], 1], expected: [0], hidden: true },
      { input: [[7, 7, 8, 8, 8, 9, 9, 9, 9, 10], 3], expected: [9, 8, 7], hidden: true },
      { input: [frequencyLadder, 3], expected: [200, 199, 198], hidden: true },
    ],
    hints: [
      'Start by counting how often each value appears with a hash map.',
      'Sorting the unique values by frequency is O(n log n). Can you exploit the fact that a frequency is never larger than `n`?',
      'Bucket sort: bucket `f` holds the values that appear exactly `f` times. Read buckets from high to low until you have `k` values.',
    ],
    solution: {
      approach: [
        '**Counting + bucket sort.** First count occurrences with a `Map`.',
        'Frequencies are integers between 1 and `n`, so instead of sorting, drop each value into `buckets[frequency]`. Walking the buckets from the highest frequency down yields the most frequent values first, and we stop after `k`.',
      ],
      code: `function topKFrequent(nums, k) {
  const freq = new Map();
  for (const n of nums) freq.set(n, (freq.get(n) ?? 0) + 1);

  const buckets = Array.from({ length: nums.length + 1 }, () => []);
  for (const [value, count] of freq) buckets[count].push(value);

  const result = [];
  for (let f = buckets.length - 1; f > 0 && result.length < k; f--) {
    for (const value of buckets[f]) {
      result.push(value);
      if (result.length === k) break;
    }
  }
  return result;
}`,
      time: 'O(n)',
      space: 'O(n)',
    },
  },
  {
    id: 5,
    slug: 'product-of-array-except-self',
    title: 'Product of Array Except Self',
    difficulty: 'Medium',
    tags: ['Array'],
    description: [
      'Given an integer array `nums`, return *an array* `answer` *such that* `answer[i]` *is equal to the product of all the elements of* `nums` *except* `nums[i]`.',
      'You must write an algorithm that runs in **O(n)** time and **without using the division operation**.',
      '**Follow-up:** can you solve it with O(1) extra space? The output array does not count as extra space.',
    ],
    functionName: 'productExceptSelf',
    params: [{ name: 'nums', type: 'number[]' }],
    returns: 'number[]',
    comparator: { kind: 'exact' },
    constraints: [
      '2 ≤ nums.length ≤ 10⁵',
      '-30 ≤ nums[i] ≤ 30',
      'The product of any prefix or suffix of `nums` fits in a 32-bit integer.',
    ],
    tests: [
      { input: [[1, 2, 3, 4]], expected: [24, 12, 8, 6] },
      { input: [[-1, 1, 0, -3, 3]], expected: [0, 0, 9, 0, 0], explanation: 'Only the zero\'s own position avoids multiplying by zero.' },
      { input: [[2, 3]], expected: [3, 2] },
      { input: [[0, 0]], expected: [0, 0], hidden: true },
      { input: [[5, 0, 2]], expected: [0, 10, 0], hidden: true },
      { input: [[1, 1, 1, 1, 1]], expected: [1, 1, 1, 1, 1], hidden: true },
      { input: [[-2, -3, 4]], expected: [-12, -8, 6], hidden: true },
      { input: [[2, ...range(9_999, () => 1)]], expected: [1, ...range(9_999, () => 2)], hidden: true },
    ],
    hints: [
      '`answer[i]` is the product of everything to the left of `i` times everything to the right of `i`.',
      'Build prefix products in a left-to-right pass, then sweep right-to-left with a running suffix product.',
      'Store the prefix products directly in the output array and keep the suffix product in a single variable for O(1) extra space.',
    ],
    solution: {
      approach: [
        '**Prefix × suffix products.** The product of all elements except `nums[i]` splits into the product of the elements before `i` and the product of the elements after `i`.',
        'The first pass writes the prefix product into `answer[i]`. The second pass walks backwards, multiplying each slot by a running suffix product. No division is needed, so zeros are handled naturally.',
      ],
      code: `function productExceptSelf(nums) {
  const n = nums.length;
  const answer = new Array(n).fill(1);
  for (let i = 1; i < n; i++) {
    answer[i] = answer[i - 1] * nums[i - 1];
  }
  let suffix = 1;
  for (let i = n - 1; i >= 0; i--) {
    answer[i] *= suffix;
    suffix *= nums[i];
  }
  return answer;
}`,
      time: 'O(n)',
      space: 'O(1) extra (output excluded)',
    },
  },
]
