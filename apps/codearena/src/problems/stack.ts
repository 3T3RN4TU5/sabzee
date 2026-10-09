import { range } from './helpers.ts'
import type { Problem } from './types.ts'

const sawtoothTemperatures = range(100_000, (i) => 30 + (i % 71))

export const stack: Problem[] = [
  {
    id: 13,
    slug: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    tags: ['String', 'Stack'],
    description: [
      'Given a string `s` containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.',
      'An input string is valid if:',
      '- Open brackets are closed by the same type of brackets.\n- Open brackets are closed in the correct order.\n- Every close bracket has a corresponding open bracket of the same type.',
    ],
    functionName: 'isValid',
    params: [{ name: 's', type: 'string' }],
    returns: 'boolean',
    comparator: { kind: 'exact' },
    constraints: ['1 ≤ s.length ≤ 10⁴', '`s` consists of parentheses only: `()[]{}`.'],
    tests: [
      { input: ['()'], expected: true },
      { input: ['()[]{}'], expected: true },
      { input: ['(]'], expected: false, explanation: '\'(\' is closed by \']\', which is the wrong type.' },
      { input: ['([)]'], expected: false, hidden: true },
      { input: ['{[]}'], expected: true, hidden: true },
      { input: ['('], expected: false, hidden: true },
      { input: [']'], expected: false, hidden: true },
      { input: ['([]{()})'], expected: true, hidden: true },
      { input: [`${'('.repeat(5_000)}${')'.repeat(5_000)}`], expected: true, hidden: true },
    ],
    hints: [
      'The most recently opened bracket must be the first one closed — last in, first out.',
      'Push opening brackets onto a stack. On a closing bracket, the top of the stack must be its matching opener.',
      'Don\'t forget the end: the string is valid only if the stack is empty after the scan.',
    ],
    solution: {
      approach: [
        '**Stack of open brackets.** Every closing bracket must match the most recent unmatched opening bracket, which is exactly the top of a stack.',
        'Push openers; for a closer, pop and compare with its expected partner. A mismatch, or popping an empty stack, means the string is invalid. Leftover openers at the end are unclosed.',
      ],
      code: `function isValid(s) {
  const opener = { ')': '(', ']': '[', '}': '{' };
  const stack = [];
  for (const ch of s) {
    if (ch in opener) {
      if (stack.pop() !== opener[ch]) return false;
    } else {
      stack.push(ch);
    }
  }
  return stack.length === 0;
}`,
      time: 'O(n)',
      space: 'O(n)',
    },
  },
  {
    id: 14,
    slug: 'daily-temperatures',
    title: 'Daily Temperatures',
    difficulty: 'Medium',
    tags: ['Array', 'Stack'],
    description: [
      'Given an array of integers `temperatures` representing the daily temperatures, return *an array* `answer` *such that* `answer[i]` *is the number of days you have to wait after the* `i`-th *day to get a warmer temperature*.',
      'If there is no future day for which this is possible, keep `answer[i] == 0` instead.',
    ],
    functionName: 'dailyTemperatures',
    params: [{ name: 'temperatures', type: 'number[]' }],
    returns: 'number[]',
    comparator: { kind: 'exact' },
    constraints: ['1 ≤ temperatures.length ≤ 10⁵', '30 ≤ temperatures[i] ≤ 100'],
    tests: [
      {
        input: [[73, 74, 75, 71, 69, 72, 76, 73]],
        expected: [1, 1, 4, 2, 1, 1, 0, 0],
        explanation: 'After day 2 (75°) the next warmer day is day 6 (76°), 4 days later.',
      },
      { input: [[30, 40, 50, 60]], expected: [1, 1, 1, 0] },
      { input: [[30, 60, 90]], expected: [1, 1, 0] },
      { input: [[90]], expected: [0], hidden: true },
      { input: [[50, 50, 50]], expected: [0, 0, 0], hidden: true },
      { input: [[90, 80, 70, 60]], expected: [0, 0, 0, 0], hidden: true },
      { input: [[55, 38, 53, 81, 61, 93, 97, 32, 43, 78]], expected: [3, 1, 1, 2, 1, 1, 0, 1, 1, 0], hidden: true },
      { input: [[89, 62, 70, 58, 47, 47, 46, 76, 100, 70]], expected: [8, 1, 5, 4, 3, 2, 1, 1, 0, 0], hidden: true },
      {
        input: [sawtoothTemperatures],
        expected: sawtoothTemperatures.map((t, i) => (t === 100 || i === sawtoothTemperatures.length - 1 ? 0 : 1)),
        hidden: true,
      },
    ],
    hints: [
      'The brute force scans forward from every day — O(n²) in the worst case.',
      'Keep a stack of indices of days still waiting for a warmer day. Their temperatures decrease from bottom to top.',
      'When today is warmer than the day on top of the stack, pop it and record `today - thatDay`. Repeat, then push today.',
    ],
    solution: {
      approach: [
        '**Monotonic decreasing stack.** The stack holds the indices of days that have not yet seen a warmer day, coldest on top.',
        'For each new day, pop every colder day from the stack — today is the first warmer day for each of them — and write the distance. Then push today. Each index is pushed and popped at most once.',
      ],
      code: `function dailyTemperatures(temperatures) {
  const answer = new Array(temperatures.length).fill(0);
  const waiting = []; // indices with decreasing temperatures
  for (let day = 0; day < temperatures.length; day++) {
    while (waiting.length > 0 && temperatures[waiting[waiting.length - 1]] < temperatures[day]) {
      const previous = waiting.pop();
      answer[previous] = day - previous;
    }
    waiting.push(day);
  }
  return answer;
}`,
      time: 'O(n)',
      space: 'O(n)',
    },
  },
  {
    id: 15,
    slug: 'largest-rectangle-in-histogram',
    title: 'Largest Rectangle in Histogram',
    difficulty: 'Hard',
    tags: ['Array', 'Stack'],
    description: [
      'Given an array of integers `heights` representing the histogram\'s bar heights where the width of each bar is `1`, return *the area of the largest rectangle in the histogram*.',
    ],
    functionName: 'largestRectangleArea',
    params: [{ name: 'heights', type: 'number[]' }],
    returns: 'number',
    comparator: { kind: 'exact' },
    constraints: ['1 ≤ heights.length ≤ 10⁵', '0 ≤ heights[i] ≤ 10⁴'],
    tests: [
      {
        input: [[2, 1, 5, 6, 2, 3]],
        expected: 10,
        explanation: 'The bars of height 5 and 6 form a rectangle of height 5 and width 2, area 10.',
      },
      { input: [[2, 4]], expected: 4 },
      { input: [[2, 1, 2]], expected: 3, explanation: 'Height 1 across all three bars gives area 3.' },
      { input: [[1]], expected: 1, hidden: true },
      { input: [[0]], expected: 0, hidden: true },
      { input: [[6, 2, 5, 4, 5, 1, 6]], expected: 12, hidden: true },
      { input: [[1, 1, 1, 1]], expected: 4, hidden: true },
      { input: [[5, 4, 3, 2, 1]], expected: 9, hidden: true },
      { input: [[4, 2, 0, 3, 2, 5]], expected: 6, hidden: true },
      // Two rising ramps 1…10⁴: the best rectangle is height 5000 across 5001 bars of one ramp.
      { input: [range(20_000, (i) => (i % 10_000) + 1)], expected: 25_005_000, hidden: true },
    ],
    hints: [
      'For each bar, the largest rectangle using that bar\'s full height stretches until the first shorter bar on each side.',
      'A stack of indices with increasing heights finds the nearest shorter bar on both sides in one pass.',
      'When a shorter bar arrives, pop taller bars: each popped bar\'s rectangle ends just before the current index and starts just after the new stack top. A final sentinel height of `0` flushes the stack.',
    ],
    solution: {
      approach: [
        '**Monotonic increasing stack.** Every maximal rectangle is as tall as some bar and spans until the nearest shorter bar on each side.',
        'Scan left to right, keeping indices of increasing heights. When the current bar is shorter than the top, the top bar can extend no further right: pop it and compute its area, using the new stack top as its left boundary. A virtual bar of height `0` at the end pops everything that remains.',
      ],
      code: `function largestRectangleArea(heights) {
  const stack = []; // indices of bars with increasing heights
  let best = 0;
  for (let i = 0; i <= heights.length; i++) {
    const current = i === heights.length ? 0 : heights[i];
    while (stack.length > 0 && heights[stack[stack.length - 1]] >= current) {
      const height = heights[stack.pop()];
      const leftBoundary = stack.length > 0 ? stack[stack.length - 1] : -1;
      best = Math.max(best, height * (i - leftBoundary - 1));
    }
    stack.push(i);
  }
  return best;
}`,
      time: 'O(n)',
      space: 'O(n)',
    },
  },
]
