import { range, rotatedCopy } from './helpers.ts'
import type { Problem } from './types.ts'

const grid20 = range(20).map((r) => range(20, (c) => r * 20 + c - 200))
const grid5 = range(5).map((r) => range(5, (c) => r * 5 + c + 1))

export const intervalsMatrix: Problem[] = [
  {
    id: 22,
    slug: 'merge-intervals',
    title: 'Merge Intervals',
    difficulty: 'Medium',
    tags: ['Array', 'Intervals'],
    description: [
      'Given an array of `intervals` where `intervals[i] = [start, end]`, merge all overlapping intervals, and return *an array of the non-overlapping intervals that cover all the intervals in the input*.',
      'Intervals that touch, like `[1,4]` and `[4,5]`, count as overlapping. The intervals in your answer may be returned in any order.',
    ],
    functionName: 'merge',
    params: [{ name: 'intervals', type: 'number[][]' }],
    returns: 'number[][]',
    comparator: { kind: 'unordered' },
    constraints: ['1 ≤ intervals.length ≤ 10⁴', 'intervals[i].length == 2', '0 ≤ start ≤ end ≤ 10⁴'],
    tests: [
      {
        input: [[[1, 3], [2, 6], [8, 10], [15, 18]]],
        expected: [[1, 6], [8, 10], [15, 18]],
        explanation: '[1,3] and [2,6] overlap, so they merge into [1,6].',
      },
      { input: [[[1, 4], [4, 5]]], expected: [[1, 5]], explanation: '[1,4] and [4,5] touch, so they count as overlapping.' },
      { input: [[[4, 7], [1, 4]]], expected: [[1, 7]], explanation: 'The input is not necessarily sorted.' },
      { input: [[[1, 4]]], expected: [[1, 4]], hidden: true },
      { input: [[[1, 4], [2, 3]]], expected: [[1, 4]], hidden: true },
      { input: [[[1, 4], [0, 0]]], expected: [[0, 0], [1, 4]], hidden: true },
      { input: [[[2, 3], [4, 5], [6, 7], [8, 9], [1, 10]]], expected: [[1, 10]], hidden: true },
      { input: [[[1, 3], [5, 7], [9, 11]]], expected: [[1, 3], [5, 7], [9, 11]], hidden: true },
      {
        input: [range(5_000, (i) => 4_999 - i).map((i) => [2 * i, 2 * i + 1])],
        expected: range(5_000).map((i) => [2 * i, 2 * i + 1]),
        hidden: true,
      },
      { input: [range(10_000).map((i) => [i, i + 1])], expected: [[0, 10_000]], hidden: true },
    ],
    hints: [
      'Sort the intervals by their start.',
      'After sorting, an interval overlaps the last merged interval exactly when its start is ≤ that interval\'s end.',
      'Either extend the last merged interval\'s end with `Math.max`, or push the current interval as a new one.',
    ],
    solution: {
      approach: [
        '**Sort, then sweep.** Once intervals are ordered by start, any interval that overlaps an earlier one must overlap the most recently merged interval.',
        'Walk the sorted list: if the current start is within the last merged interval, extend its end (with `Math.max`, since the current one may be fully contained); otherwise start a new merged interval.',
      ],
      code: `function merge(intervals) {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }
  return merged;
}`,
      time: 'O(n log n)',
      space: 'O(n)',
    },
  },
  {
    id: 23,
    slug: 'rotate-image',
    title: 'Rotate Image',
    difficulty: 'Medium',
    tags: ['Array', 'Matrix', 'Math'],
    description: [
      'You are given an `n x n` 2D `matrix` representing an image. Rotate the image by **90 degrees clockwise**.',
      'You have to rotate the image **in-place**, which means you have to modify the input matrix directly. **Do not** allocate another 2D matrix to do the rotation.',
      'The judge inspects `matrix` after your function returns; the return value is ignored.',
    ],
    functionName: 'rotate',
    params: [{ name: 'matrix', type: 'number[][]' }],
    returns: 'void',
    mutatesArg: 0,
    comparator: { kind: 'exact' },
    constraints: ['n == matrix.length == matrix[i].length', '1 ≤ n ≤ 20', '-1000 ≤ matrix[i][j] ≤ 1000'],
    tests: [
      {
        input: [[[1, 2, 3], [4, 5, 6], [7, 8, 9]]],
        expected: [[7, 4, 1], [8, 5, 2], [9, 6, 3]],
        explanation: 'The first column, read bottom to top, becomes the first row.',
      },
      {
        input: [[[5, 1, 9, 11], [2, 4, 8, 10], [13, 3, 6, 7], [15, 14, 12, 16]]],
        expected: [[15, 13, 2, 5], [14, 3, 4, 1], [12, 6, 8, 9], [16, 7, 10, 11]],
      },
      { input: [[[1]]], expected: [[1]] },
      { input: [[[1, 2], [3, 4]]], expected: [[3, 1], [4, 2]], hidden: true },
      { input: [[[-1, -2], [-3, -4]]], expected: [[-3, -1], [-4, -2]], hidden: true },
      { input: [[[0, 0], [0, 1]]], expected: [[0, 0], [1, 0]], hidden: true },
      {
        input: [grid5],
        expected: [
          [21, 16, 11, 6, 1],
          [22, 17, 12, 7, 2],
          [23, 18, 13, 8, 3],
          [24, 19, 14, 9, 4],
          [25, 20, 15, 10, 5],
        ],
        hidden: true,
      },
      { input: [grid20], expected: rotatedCopy(grid20), hidden: true },
    ],
    hints: [
      'Track where a single cell moves: `(r, c)` goes to `(c, n - 1 - r)`.',
      'A clockwise rotation equals a transpose (swap across the main diagonal) followed by reversing each row.',
      'Both steps are in-place swaps, so no extra matrix is needed.',
    ],
    solution: {
      approach: [
        '**Transpose, then mirror.** Transposing swaps `matrix[r][c]` with `matrix[c][r]`, turning rows into columns. Reversing each row then flips the image horizontally, and the combination is exactly a 90° clockwise rotation.',
        'Only the upper triangle is visited during the transpose so that each pair is swapped once.',
      ],
      code: `function rotate(matrix) {
  const n = matrix.length;
  for (let r = 0; r < n; r++) {
    for (let c = r + 1; c < n; c++) {
      [matrix[r][c], matrix[c][r]] = [matrix[c][r], matrix[r][c]];
    }
  }
  for (const row of matrix) row.reverse();
}`,
      time: 'O(n²)',
      space: 'O(1)',
    },
  },
  {
    id: 24,
    slug: 'spiral-matrix',
    title: 'Spiral Matrix',
    difficulty: 'Medium',
    tags: ['Array', 'Matrix'],
    description: ['Given an `m x n` `matrix`, return *all elements of the* `matrix` *in spiral order*, starting at the top-left corner and moving clockwise.'],
    functionName: 'spiralOrder',
    params: [{ name: 'matrix', type: 'number[][]' }],
    returns: 'number[]',
    comparator: { kind: 'exact' },
    constraints: ['m == matrix.length', 'n == matrix[i].length', '1 ≤ m, n ≤ 10', '-100 ≤ matrix[i][j] ≤ 100'],
    tests: [
      { input: [[[1, 2, 3], [4, 5, 6], [7, 8, 9]]], expected: [1, 2, 3, 6, 9, 8, 7, 4, 5] },
      { input: [[[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12]]], expected: [1, 2, 3, 4, 8, 12, 11, 10, 9, 5, 6, 7] },
      { input: [[[1, 2], [3, 4]]], expected: [1, 2, 4, 3] },
      { input: [[[1]]], expected: [1], hidden: true },
      { input: [[[1, 2, 3, 4]]], expected: [1, 2, 3, 4], hidden: true },
      { input: [[[1], [2], [3]]], expected: [1, 2, 3], hidden: true },
      { input: [[[1, 2], [3, 4], [5, 6]]], expected: [1, 2, 4, 6, 5, 3], hidden: true },
      { input: [[[1, 2, 3], [4, 5, 6]]], expected: [1, 2, 3, 6, 5, 4], hidden: true },
      {
        input: [[[1, 2, 3, 4], [5, 6, 7, 8], [9, 10, 11, 12], [13, 14, 15, 16]]],
        expected: [1, 2, 3, 4, 8, 12, 16, 15, 14, 13, 9, 5, 6, 7, 11, 10],
        hidden: true,
      },
      { input: [[[2, 5, 8], [4, 0, -1]]], expected: [2, 5, 8, -1, 0, 4], hidden: true },
    ],
    hints: [
      'Keep four boundaries: `top`, `bottom`, `left` and `right`.',
      'Walk right along `top`, down along `right`, left along `bottom` and up along `left`, shrinking each boundary after you walk it.',
      'Re-check `top <= bottom` and `left <= right` before walking the bottom row and the left column, or single rows and columns get visited twice.',
    ],
    solution: {
      approach: [
        '**Peel the layers.** Four boundaries describe the part of the matrix not yet visited.',
        'Each loop iteration walks one full ring — top row, right column, bottom row, left column — and moves the corresponding boundary inward. The guards before the bottom and left walks stop a lone remaining row or column from being emitted twice.',
      ],
      code: `function spiralOrder(matrix) {
  const result = [];
  let top = 0;
  let bottom = matrix.length - 1;
  let left = 0;
  let right = matrix[0].length - 1;
  while (top <= bottom && left <= right) {
    for (let c = left; c <= right; c++) result.push(matrix[top][c]);
    top++;
    for (let r = top; r <= bottom; r++) result.push(matrix[r][right]);
    right--;
    if (top <= bottom) {
      for (let c = right; c >= left; c--) result.push(matrix[bottom][c]);
      bottom--;
    }
    if (left <= right) {
      for (let r = bottom; r >= top; r--) result.push(matrix[r][left]);
      left++;
    }
  }
  return result;
}`,
      time: 'O(m × n)',
      space: 'O(1) besides the output',
    },
  },
]
