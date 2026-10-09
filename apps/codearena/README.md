# 🏟️ CodeArena — LeetCode-style interview practice in the browser

**Live demo:** [codearena-jeevan.vercel.app](https://codearena-jeevan.vercel.app)

Practise 26 hand-written coding interview problems, from Two Sum to Trapping Rain Water, in a dark, VS Code-style workspace. Everything runs client-side. A module Web Worker judges your JavaScript against sample and hidden tests, enforces a 3-second time limit, and reports runtime, captured `console.log` output and readable errors with line numbers. Hints, reference solutions, submission history, a per-problem timer and a progress dashboard (streak, acceptance rate, activity heatmap) are saved in your browser, so there is no backend and no sign-up.

**Tech:** React 19 · TypeScript (strict) · Vite 8 (Rolldown) · Tailwind CSS v4 · CodeMirror 6 · Web Workers · Lucide icons

## Features

- **26 problems** (7 Easy · 15 Medium · 4 Hard) across 13 topics: arrays, hashing, two pointers, sliding window, stacks, binary search, DP, intervals, matrices and recursion. Each problem has examples, constraints, 7–11 tests (including hidden edge cases and large inputs), 2–3 progressive hints and a reference solution with time and space complexity notes.
- **Sandboxed judge**: user code runs in a dedicated module Web Worker. The worker builds the function with `new Function`, gives every test a fresh `structuredClone` of its input, captures console output (capped) and times each test. The main thread enforces a 3 s wall-clock limit by terminating and respawning the worker, so `while (true) {}` ends in **Time Limit Exceeded** and the page keeps responding.
- **Comparators**: exact deep equality, order-insensitive results (Two Sum, 3Sum, Group Anagrams, Merge Intervals…), float tolerance (Median of Two Sorted Arrays, Pow) and in-place checks (Rotate Image compares the mutated argument). Typed arrays such as `Int32Array` count as arrays, and a sparse `new Array(n)` never passes for real values.
- **Run vs Submit**: Run executes the visible samples only. Submit judges every test and never reveals hidden inputs ("Hidden test 6 failed"). The verdict banner shows Accepted, Wrong Answer, Runtime Error, Compile Error or TLE, along with pass counts, runtime, per-test output, expected values and stdout.
- **Editor**: CodeMirror 6 with One Dark, line numbers, bracket matching, autocomplete (including globals such as `Math` and `Map`), live syntax-error markers, adjustable font size, reset to starter code and per-problem autosave.
- **Keyboard shortcuts**: <kbd>Ctrl/⌘</kbd>+<kbd>Enter</kbd> runs and <kbd>Ctrl/⌘</kbd>+<kbd>Shift</kbd>+<kbd>Enter</kbd> submits, including from inside the editor.
- **Problem list**: search plus difficulty, status (solved / attempted / to do) and topic filters, with status icons. The sidebar is collapsible and becomes a drawer on smaller screens.
- **Problem tabs**: Description, Hints (revealed one at a time), Solution (locked until you submit once or give up) and Submissions (history, with any past code loadable back into the editor).
- **Per-problem timer** with start, pause and reset. It records your solve time when a submission is accepted.
- **Progress dashboard**: solved ring with difficulty bars, acceptance rate, current and longest daily streak, activity heatmap, topic breakdown, recent submissions and a "pick a random unsolved problem" button.
- Deep links (`#two-sum`, `#progress`), resizable split panes (mouse or keyboard), and a mobile layout with Problem / Code / Result tabs.
- Accessible: WAI-ARIA tabs and window splitters, visible focus rings, a native `<dialog>` for confirmations, screen-reader verdict announcements and `prefers-reduced-motion` support.
- `npm run verify` sends every reference solution, plus the empty starter code, through the same judge code the worker uses, checks the problem metadata, and asserts comparator invariants (wrong answers rejected, equivalent ones accepted).

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check + production build
npm run lint      # oxlint
npm run verify    # judge all 26 reference solutions against their tests
```

No environment variables are needed. Progress lives in `localStorage` under versioned `codearena:v1:*` keys, and every read is validated.

## Structure

```
scripts/
└── verify-problems.ts        # Runs every reference solution through the judge
src/
├── App.tsx                   # Hash routing, sidebar / drawer, layout shell
├── problems/
│   ├── types.ts              # Problem, TestCase, Comparator, tags
│   ├── index.ts              # Problem bank + starter-code generator
│   ├── helpers.ts            # Generators for large / cross-checked test data
│   └── *.ts                  # Problems grouped by topic
├── runner/
│   ├── runner.worker.ts      # Module worker: loads code, captures console, streams results
│   ├── execute.ts            # Pure judge core (shared with the verify script)
│   ├── compare.ts            # exact / unordered / float comparators
│   ├── format.ts             # Safe value formatting (cycles, huge arrays…)
│   ├── verdict.ts            # Turns streamed reports into a verdict
│   ├── protocol.ts           # Worker message types
│   └── useRunner.ts          # Worker lifecycle + time limit
├── lib/
│   ├── storage.ts            # Versioned, validated localStorage stores
│   ├── progress.ts           # Submissions, hints, timers, settings, drafts
│   ├── stats.ts              # Streaks, acceptance, per-difficulty / topic stats
│   ├── filters.ts            # Problem-list search and filters
│   └── hooks.ts, format.ts, theme.ts, a11y.ts
└── components/
    ├── Workspace.tsx         # Problem / editor / results split, shortcuts, judging
    ├── Sidebar.tsx, TopBar.tsx, Timer.tsx, SplitHandle.tsx, Tabs.tsx
    ├── RichText.tsx          # Markdown-lite renderer (React elements only)
    ├── ConfirmDialog.tsx, NotFound.tsx, ui.tsx
    ├── editor/               # Lazy-loaded CodeMirror editor
    ├── problem/              # Description, Hints, Solution, Submissions tabs
    ├── results/              # Testcases, verdict banner, per-test details
    └── dashboard/            # Progress dashboard, solved ring, heatmap
```
