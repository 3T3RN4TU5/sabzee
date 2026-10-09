import { range } from './helpers.ts'
import type { Problem } from './types.ts'

export const slidingWindow: Problem[] = [
  {
    id: 10,
    slug: 'best-time-to-buy-and-sell-stock',
    title: 'Best Time to Buy and Sell Stock',
    difficulty: 'Easy',
    tags: ['Array', 'Sliding Window', 'Greedy'],
    description: [
      'You are given an array `prices` where `prices[i]` is the price of a given stock on the `i`-th day.',
      'You want to maximize your profit by choosing a **single day** to buy one stock and choosing a **different day in the future** to sell that stock.',
      'Return *the maximum profit you can achieve from this transaction*. If you cannot achieve any profit, return `0`.',
    ],
    functionName: 'maxProfit',
    params: [{ name: 'prices', type: 'number[]' }],
    returns: 'number',
    comparator: { kind: 'exact' },
    constraints: ['1 ≤ prices.length ≤ 10⁵', '0 ≤ prices[i] ≤ 10⁴'],
    tests: [
      {
        input: [[7, 1, 5, 3, 6, 4]],
        expected: 5,
        explanation: 'Buy on day 2 (price = 1) and sell on day 5 (price = 6): profit = 6 - 1 = 5. Selling on day 1 is not allowed because you must buy before you sell.',
      },
      { input: [[7, 6, 4, 3, 1]], expected: 0, explanation: 'Prices only fall, so the best choice is not to trade.' },
      { input: [[2, 4, 1]], expected: 2 },
      { input: [[1]], expected: 0, hidden: true },
      { input: [[1, 2]], expected: 1, hidden: true },
      { input: [[3, 3, 3]], expected: 0, hidden: true },
      { input: [[2, 1, 2, 1, 0, 1, 2]], expected: 2, hidden: true },
      { input: [[3, 2, 6, 5, 0, 3]], expected: 4, hidden: true },
      { input: [range(100_000, (i) => Math.floor((99_999 - i) / 10))], expected: 0, hidden: true },
      { input: [range(100_000, (i) => (i < 50_000 ? 5_000 + (i % 7) : i % 10_000))], expected: 9_999, hidden: true },
    ],
    hints: [
      'For each day, the best sale is today\'s price minus the lowest price seen *before* today.',
      'Track the minimum price so far and the best profit so far in a single pass.',
    ],
    solution: {
      approach: [
        '**Track the cheapest buy so far.** Selling on day `i` is best paired with the minimum price among days `0…i`.',
        'Scan once, updating the running minimum and the best `price - minPrice`. Equivalently, this is a sliding window whose left edge jumps to every new minimum.',
      ],
      code: `function maxProfit(prices) {
  let minPrice = Infinity;
  let best = 0;
  for (const price of prices) {
    minPrice = Math.min(minPrice, price);
    best = Math.max(best, price - minPrice);
  }
  return best;
}`,
      time: 'O(n)',
      space: 'O(1)',
    },
  },
  {
    id: 11,
    slug: 'longest-substring-without-repeating-characters',
    title: 'Longest Substring Without Repeating Characters',
    difficulty: 'Medium',
    tags: ['String', 'Hash Map', 'Sliding Window'],
    description: [
      'Given a string `s`, find the length of the **longest substring** without repeating characters.',
      'A substring is a contiguous, non-empty sequence of characters within a string.',
    ],
    functionName: 'lengthOfLongestSubstring',
    params: [{ name: 's', type: 'string' }],
    returns: 'number',
    comparator: { kind: 'exact' },
    constraints: ['0 ≤ s.length ≤ 5 × 10⁴', '`s` consists of English letters, digits, symbols and spaces.'],
    tests: [
      { input: ['abcabcbb'], expected: 3, explanation: 'The answer is "abc", with the length of 3.' },
      { input: ['bbbbb'], expected: 1, explanation: 'The answer is "b", with the length of 1.' },
      {
        input: ['pwwkew'],
        expected: 3,
        explanation: 'The answer is "wke", with the length of 3. "pwke" is a subsequence, not a substring.',
      },
      { input: [''], expected: 0, hidden: true },
      { input: [' '], expected: 1, hidden: true },
      { input: ['dvdf'], expected: 3, hidden: true },
      { input: ['abba'], expected: 2, hidden: true },
      { input: ['tmmzuxt'], expected: 5, hidden: true },
      { input: ['abcdefghijklmnopqrstuvwxyz'.repeat(1_900)], expected: 26, hidden: true },
    ],
    hints: [
      'Maintain a window `[left, right]` that never contains a duplicate character.',
      'When `s[right]` is already inside the window, the window must start just after that character\'s previous occurrence.',
      'Store each character\'s last index in a map so the left edge can jump in O(1) — but never move it backwards (try `"abba"`).',
    ],
    solution: {
      approach: [
        '**Sliding window with last-seen indices.** Extend the window one character at a time.',
        'If the new character already occurs inside the window, move `left` to one past its previous position. The `>= left` check matters: an occurrence *before* the window must not drag `left` backwards.',
        'The window is always duplicate-free, so its maximum size is the answer.',
      ],
      code: `function lengthOfLongestSubstring(s) {
  const lastSeen = new Map(); // char -> last index
  let left = 0;
  let best = 0;
  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    if (lastSeen.has(ch) && lastSeen.get(ch) >= left) {
      left = lastSeen.get(ch) + 1;
    }
    lastSeen.set(ch, right);
    best = Math.max(best, right - left + 1);
  }
  return best;
}`,
      time: 'O(n)',
      space: 'O(min(n, alphabet))',
    },
  },
  {
    id: 12,
    slug: 'minimum-window-substring',
    title: 'Minimum Window Substring',
    difficulty: 'Hard',
    tags: ['String', 'Hash Map', 'Sliding Window'],
    description: [
      'Given two strings `s` and `t` of lengths `m` and `n`, return *the minimum window substring of* `s` *such that every character in* `t` *(including duplicates) is included in the window*. If there is no such substring, return the empty string `""`.',
      'The test cases are generated so that the answer is **unique**.',
      '**Follow-up:** can you find an algorithm that runs in O(m + n) time?',
    ],
    functionName: 'minWindow',
    params: [
      { name: 's', type: 'string' },
      { name: 't', type: 'string' },
    ],
    returns: 'string',
    comparator: { kind: 'exact' },
    constraints: [
      'm == s.length, n == t.length',
      '1 ≤ m, n ≤ 10⁵',
      '`s` and `t` consist of uppercase and lowercase English letters.',
    ],
    tests: [
      {
        input: ['ADOBECODEBANC', 'ABC'],
        expected: 'BANC',
        explanation: '"BANC" is the shortest window containing \'A\', \'B\' and \'C\'.',
      },
      { input: ['a', 'a'], expected: 'a' },
      {
        input: ['a', 'aa'],
        expected: '',
        explanation: 'Both \'a\'s from t must be in the window, but s has only one, so no window exists.',
      },
      { input: ['ab', 'b'], expected: 'b', hidden: true },
      { input: ['bba', 'ab'], expected: 'ba', hidden: true },
      { input: ['aa', 'aa'], expected: 'aa', hidden: true },
      { input: ['abc', 'd'], expected: '', hidden: true },
      { input: ['cabwefgewcwaefgcf', 'cae'], expected: 'cwae', hidden: true },
      { input: ['ADOBECODEBANC', 'AABC'], expected: 'ADOBECODEBA', hidden: true },
      { input: [`${'x'.repeat(50_000)}abc${'x'.repeat(49_997)}`, 'cba'], expected: 'abc', hidden: true },
    ],
    hints: [
      'Expand a window to the right until it contains every character of `t`, counting duplicates.',
      'Once the window is valid, shrink it from the left as far as possible while it stays valid, recording the best window.',
      'Keep a `need` count per character plus a single `missing` counter so validity is an O(1) check.',
    ],
    solution: {
      approach: [
        '**Expand / contract sliding window.** `need[c]` records how many more copies of `c` the window requires, and `missing` counts the characters of `t` still unaccounted for.',
        'Move `right` forward, consuming characters. When `missing` hits zero the window is valid: record it, then advance `left`, giving characters back to `need`, until the window becomes invalid again.',
        'Each index enters and leaves the window at most once, so the scan is linear.',
      ],
      code: `function minWindow(s, t) {
  const need = new Map();
  for (const ch of t) need.set(ch, (need.get(ch) ?? 0) + 1);
  let missing = t.length;
  let bestStart = 0;
  let bestLength = Infinity;
  let left = 0;

  for (let right = 0; right < s.length; right++) {
    const ch = s[right];
    if (need.has(ch)) {
      if (need.get(ch) > 0) missing--;
      need.set(ch, need.get(ch) - 1);
    }
    while (missing === 0) {
      if (right - left + 1 < bestLength) {
        bestStart = left;
        bestLength = right - left + 1;
      }
      const out = s[left];
      if (need.has(out)) {
        need.set(out, need.get(out) + 1);
        if (need.get(out) > 0) missing++;
      }
      left++;
    }
  }
  return bestLength === Infinity ? '' : s.slice(bestStart, bestStart + bestLength);
}`,
      time: 'O(m + n)',
      space: 'O(k) for k distinct characters in t',
    },
  },
]
