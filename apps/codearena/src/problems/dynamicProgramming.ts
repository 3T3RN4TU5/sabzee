import { range } from './helpers.ts'
import type { Problem } from './types.ts'

export const dynamicProgramming: Problem[] = [
  {
    id: 19,
    slug: 'climbing-stairs',
    title: 'Climbing Stairs',
    difficulty: 'Easy',
    tags: ['Dynamic Programming', 'Math', 'Recursion'],
    description: [
      'You are climbing a staircase. It takes `n` steps to reach the top.',
      'Each time you can either climb `1` or `2` steps. In how many distinct ways can you climb to the top?',
    ],
    functionName: 'climbStairs',
    params: [{ name: 'n', type: 'number' }],
    returns: 'number',
    comparator: { kind: 'exact' },
    constraints: ['1 ≤ n ≤ 45'],
    tests: [
      { input: [2], expected: 2, explanation: 'There are two ways: 1 + 1 and 2.' },
      { input: [3], expected: 3, explanation: 'There are three ways: 1 + 1 + 1, 1 + 2 and 2 + 1.' },
      { input: [1], expected: 1 },
      { input: [4], expected: 5, hidden: true },
      { input: [5], expected: 8, hidden: true },
      { input: [10], expected: 89, hidden: true },
      { input: [30], expected: 1_346_269, hidden: true },
      { input: [45], expected: 1_836_311_903, hidden: true },
    ],
    hints: [
      'To stand on step `n`, your last move came either from step `n - 1` or from step `n - 2`.',
      'So `ways(n) = ways(n - 1) + ways(n - 2)` — the Fibonacci recurrence. Plain recursion recomputes the same values exponentially often (try `n = 45`).',
      'Iterate bottom-up keeping only the last two values: O(n) time and O(1) space.',
    ],
    solution: {
      approach: [
        '**Bottom-up Fibonacci.** The number of ways to reach step `n` is the sum of the ways to reach the two steps below it, with `ways(1) = 1` and `ways(2) = 2`.',
        'Naive recursion is exponential because it solves the same sub-problems repeatedly; memoisation or iteration makes each value computed once. Only the two previous values are ever needed, so two variables suffice.',
      ],
      code: `function climbStairs(n) {
  let prev = 1; // ways to reach step i - 1
  let curr = 1; // ways to reach step i
  for (let i = 2; i <= n; i++) {
    [prev, curr] = [curr, prev + curr];
  }
  return curr;
}`,
      time: 'O(n)',
      space: 'O(1)',
    },
  },
  {
    id: 20,
    slug: 'maximum-subarray',
    title: 'Maximum Subarray',
    difficulty: 'Medium',
    tags: ['Array', 'Dynamic Programming', 'Greedy'],
    description: [
      'Given an integer array `nums`, find the subarray with the largest sum, and return *its sum*.',
      'A subarray is a contiguous non-empty sequence of elements within an array.',
      '**Follow-up:** once you have the O(n) solution, try the divide-and-conquer approach, which is more subtle.',
    ],
    functionName: 'maxSubArray',
    params: [{ name: 'nums', type: 'number[]' }],
    returns: 'number',
    comparator: { kind: 'exact' },
    constraints: ['1 ≤ nums.length ≤ 10⁵', '-10⁴ ≤ nums[i] ≤ 10⁴'],
    tests: [
      { input: [[-2, 1, -3, 4, -1, 2, 1, -5, 4]], expected: 6, explanation: 'The subarray [4,-1,2,1] has the largest sum, 6.' },
      { input: [[1]], expected: 1 },
      { input: [[5, 4, -1, 7, 8]], expected: 23, explanation: 'The whole array [5,4,-1,7,8] sums to 23.' },
      { input: [[-1]], expected: -1, hidden: true },
      { input: [[-3, -2, -5]], expected: -2, hidden: true },
      { input: [[0, 0, 0]], expected: 0, hidden: true },
      { input: [[-2, -1]], expected: -1, hidden: true },
      { input: [[8, -19, 5, -4, 20]], expected: 21, hidden: true },
      { input: [range(100_000, (i) => (i % 2 === 0 ? 1_000 : -1))], expected: 49_950_001, hidden: true },
    ],
    hints: [
      'If the best subarray ending at the previous index has a negative sum, it can only hurt — start fresh.',
      'Kadane\'s algorithm: `current = max(nums[i], current + nums[i])`, and keep the best `current` you have seen.',
      'Careful with all-negative arrays: the answer is the largest single element, not `0`.',
    ],
    solution: {
      approach: [
        '**Kadane\'s algorithm.** Let `current` be the best sum of a subarray that *ends* at index `i`. Either it extends the best subarray ending at `i - 1`, or it starts fresh at `i` — whichever is larger.',
        'The answer is the maximum `current` over all indices. Initialising both values with `nums[0]` handles arrays where every number is negative.',
      ],
      code: `function maxSubArray(nums) {
  let current = nums[0];
  let best = nums[0];
  for (let i = 1; i < nums.length; i++) {
    current = Math.max(nums[i], current + nums[i]);
    best = Math.max(best, current);
  }
  return best;
}`,
      time: 'O(n)',
      space: 'O(1)',
    },
  },
  {
    id: 21,
    slug: 'coin-change',
    title: 'Coin Change',
    difficulty: 'Medium',
    tags: ['Array', 'Dynamic Programming'],
    description: [
      'You are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total amount of money.',
      'Return *the fewest number of coins that you need to make up that amount*. If that amount of money cannot be made up by any combination of the coins, return `-1`.',
      'You may assume that you have an infinite number of each kind of coin.',
    ],
    functionName: 'coinChange',
    params: [
      { name: 'coins', type: 'number[]' },
      { name: 'amount', type: 'number' },
    ],
    returns: 'number',
    comparator: { kind: 'exact' },
    constraints: ['1 ≤ coins.length ≤ 12', '1 ≤ coins[i] ≤ 2³¹ - 1', '0 ≤ amount ≤ 10⁴'],
    tests: [
      { input: [[1, 2, 5], 11], expected: 3, explanation: '11 = 5 + 5 + 1' },
      { input: [[2], 3], expected: -1, explanation: 'Only even amounts can be made from 2-coins.' },
      { input: [[1], 0], expected: 0, explanation: 'Zero coins make an amount of 0.' },
      { input: [[1], 1], expected: 1, hidden: true },
      { input: [[2, 5, 10, 1], 27], expected: 4, hidden: true },
      { input: [[1, 3, 4], 6], expected: 2, hidden: true },
      { input: [[3, 7], 5], expected: -1, hidden: true },
      { input: [[186, 419, 83, 408], 6_249], expected: 20, hidden: true },
      { input: [[7], 10_000], expected: -1, hidden: true },
      { input: [[1, 5, 10, 25], 10_000], expected: 400, hidden: true },
      { input: [[2_147_483_647], 2], expected: -1, hidden: true },
    ],
    hints: [
      'Greedy (always take the largest coin) fails: with coins `[1, 3, 4]` and amount `6`, greedy uses 4 + 1 + 1 but 3 + 3 needs only two coins.',
      'Let `dp[a]` be the fewest coins that make amount `a`. Then `dp[a] = 1 + min(dp[a - c])` over every coin `c ≤ a`.',
      'Fill `dp` bottom-up from `0` to `amount`, starting with `dp[0] = 0` and everything else `Infinity`.',
    ],
    solution: {
      approach: [
        '**Bottom-up dynamic programming.** `dp[a]` is the minimum number of coins summing to `a`. The last coin used is some `c`, leaving `a - c`, which must itself be made optimally.',
        'Computing `dp` for every amount from `0` upwards means all smaller sub-answers are ready when needed. Unreachable amounts stay at `Infinity` and are reported as `-1`.',
      ],
      code: `function coinChange(coins, amount) {
  const dp = new Array(amount + 1).fill(Infinity);
  dp[0] = 0;
  for (let a = 1; a <= amount; a++) {
    for (const coin of coins) {
      if (coin <= a && dp[a - coin] + 1 < dp[a]) {
        dp[a] = dp[a - coin] + 1;
      }
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}`,
      time: 'O(amount × coins)',
      space: 'O(amount)',
    },
  },
]
