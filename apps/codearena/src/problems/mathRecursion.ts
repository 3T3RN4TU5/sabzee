import { balancedParentheses } from './helpers.ts'
import type { Problem } from './types.ts'

export const mathRecursion: Problem[] = [
  {
    id: 25,
    slug: 'powx-n',
    title: 'Pow(x, n)',
    difficulty: 'Medium',
    tags: ['Math', 'Recursion'],
    description: [
      'Implement `pow(x, n)`, which calculates `x` raised to the power `n` (i.e. xⁿ).',
      'Do not call `Math.pow` or use the `**` operator — the point is to implement fast exponentiation yourself. Answers within a relative error of 10⁻⁵ are accepted.',
    ],
    functionName: 'myPow',
    params: [
      { name: 'x', type: 'number' },
      { name: 'n', type: 'number' },
    ],
    returns: 'number',
    comparator: { kind: 'float', tolerance: 1e-5 },
    constraints: [
      '-100.0 < x < 100.0',
      '-2³¹ ≤ n ≤ 2³¹ - 1',
      '`n` is an integer.',
      'Either `x` is not zero or `n > 0`.',
      '-10⁴ ≤ xⁿ ≤ 10⁴',
    ],
    tests: [
      { input: [2, 10], expected: 1024 },
      { input: [2.1, 3], expected: 9.261 },
      { input: [2, -2], expected: 0.25, explanation: '2⁻² = 1 / 2² = 1 / 4 = 0.25' },
      { input: [1, 2_147_483_647], expected: 1, hidden: true },
      { input: [2, 0], expected: 1, hidden: true },
      { input: [-2, 3], expected: -8, hidden: true },
      { input: [0.5, -3], expected: 8, hidden: true },
      { input: [0.00001, 2_147_483_647], expected: 0, hidden: true },
      { input: [1.00001, 123_456], expected: 3.4368447520907104, hidden: true },
      { input: [-1, -2_147_483_648], expected: 1, hidden: true },
      { input: [2, -2_147_483_648], expected: 0, hidden: true },
    ],
    hints: [
      'Multiplying `x` by itself `n` times is O(n) — far too slow when `n` is around 2³¹.',
      'Use exponentiation by squaring: xⁿ = (x²)ⁿᐟ² for even `n`, and x · xⁿ⁻¹ for odd `n`.',
      'Handle negative exponents with xⁿ = (1/x)⁻ⁿ. Avoid bit tricks like `n >> 1`: they overflow for |n| ≥ 2³¹ in JavaScript, so halve with `Math.floor(n / 2)`.',
    ],
    solution: {
      approach: [
        '**Exponentiation by squaring.** The recursive identity xⁿ = (x²)ⁿᐟ² (times one extra `x` when `n` is odd) halves the exponent at every step.',
        'The iterative version reads the exponent\'s binary digits: square the base each round and multiply it into the result whenever the current bit is set. A negative exponent is handled once up front as 1 / x⁻ⁿ.',
      ],
      code: `function myPow(x, n) {
  if (n < 0) return 1 / myPow(x, -n);
  let result = 1;
  let base = x;
  let exponent = n;
  while (exponent > 0) {
    if (exponent % 2 === 1) result *= base;
    base *= base;
    exponent = Math.floor(exponent / 2);
  }
  return result;
}`,
      time: 'O(log n)',
      space: 'O(1)',
    },
  },
  {
    id: 26,
    slug: 'generate-parentheses',
    title: 'Generate Parentheses',
    difficulty: 'Medium',
    tags: ['String', 'Recursion'],
    description: [
      'Given `n` pairs of parentheses, write a function to *generate all combinations of well-formed parentheses*.',
      'The combinations may be returned in any order.',
    ],
    functionName: 'generateParenthesis',
    params: [{ name: 'n', type: 'number' }],
    returns: 'string[]',
    comparator: { kind: 'unordered' },
    constraints: ['1 ≤ n ≤ 8'],
    tests: [
      { input: [3], expected: ['((()))', '(()())', '(())()', '()(())', '()()()'] },
      { input: [1], expected: ['()'] },
      { input: [2], expected: ['(())', '()()'] },
      {
        input: [4],
        expected: [
          '(((())))', '((()()))', '((())())', '((()))()', '(()(()))', '(()()())', '(()())()',
          '(())(())', '(())()()', '()((()))', '()(()())', '()(())()', '()()(())', '()()()()',
        ],
        hidden: true,
      },
      { input: [5], expected: balancedParentheses(5), hidden: true },
      { input: [6], expected: balancedParentheses(6), hidden: true },
      { input: [7], expected: balancedParentheses(7), hidden: true },
    ],
    hints: [
      'Build each string one character at a time — you never need to generate an invalid prefix.',
      'You may add `(` while fewer than `n` have been opened, and `)` while there are more opens than closes.',
      'Backtracking: recurse with `(current, open, close)` and record `current` once its length reaches `2n`.',
    ],
    solution: {
      approach: [
        '**Backtracking with pruning.** A prefix can still become valid as long as it never closes more parentheses than it has opened and never opens more than `n`.',
        'Recursively try adding `(` (if `open < n`) and `)` (if `close < open`). Every leaf at length `2n` is a distinct valid string, so the work is proportional to the output — the n-th Catalan number of strings.',
      ],
      code: `function generateParenthesis(n) {
  const result = [];
  const build = (current, open, close) => {
    if (current.length === 2 * n) {
      result.push(current);
      return;
    }
    if (open < n) build(current + '(', open + 1, close);
    if (close < open) build(current + ')', open, close + 1);
  };
  build('', 0, 0);
  return result;
}`,
      time: 'O(4ⁿ / √n)',
      space: 'O(n) recursion depth',
    },
  },
]
