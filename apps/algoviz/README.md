# 🧭 AlgoViz — Sorting & pathfinding visualizer for DSA prep

**Live demo:** [algoviz-jeevan.vercel.app](https://algoviz-jeevan.vercel.app)

An interactive way to understand the algorithms that come up in coding interviews. Step through seven sorting algorithms one compare, swap or write at a time, with the executing pseudocode line highlighted, or race two of them on the same input. Then switch to the grid: draw walls and weights, drag the start and target, generate a maze, and watch BFS, DFS, Dijkstra, A*, Greedy best-first and Bidirectional BFS explore it.

**Tech:** React 19 · TypeScript (strict) · Vite 8 (Rolldown) · Tailwind CSS v4 · Lucide icons. No other runtime dependencies.

## Features

**Sorting**

- **7 algorithms**: Bubble, Selection, Insertion, Merge, Quick (**Lomuto** partition, last element as pivot), Heap and Shell (Knuth gaps 1, 4, 13, 40…)
- Every algorithm is a **pure step generator**: it records `compare` / `swap` / `overwrite` / `pivot` / `sorted` operations up front, so playback supports **play, pause, step forward, step backward and timeline scrubbing**
- Controls for array size (8–150), 12 speed levels, and input presets: **random, nearly sorted, reversed, few unique**
- Live counters: comparisons, swaps, array writes and step *i* of *N*, plus a colour legend and a plain-English caption for the current step
- **Info panel** per algorithm: description, best / average / worst time, space, stable or not, in-place or not, and **pseudocode with the executing line highlighted**
- **Race mode**: two algorithms on the same input, advanced one operation per tick on a shared clock, with a head-to-head scoreboard and winner

**Pathfinding**

- **6 algorithms**, each labelled weighted or unweighted and with or without a shortest-path guarantee: Dijkstra, A* (Manhattan heuristic), BFS, Bidirectional BFS, Greedy best-first, DFS
- Grid sized to the viewport (21 rows × 47 columns on desktop, 13 on a phone). **Drag** the start and target, **draw or erase walls** with mouse, pen or touch, and a **weight brush** (cost 5)
- **Animated maze generators**: recursive division, randomized DFS (perfect maze), random walls, random weights, plus clear path / clear walls
- Animated exploration, then the shortest path. After a run, **moving the start, target or walls recomputes instantly** without animation
- Stats: cells visited, path length, path cost and the algorithm's own compute time

**Engineering**

- Algorithm code in `src/algorithms` has **no React imports**. `npm test` runs about **145,000 correctness checks**:
  - every sort handles random, sorted, reversed and duplicate-heavy arrays of many sizes, and its steps replay to the same result
  - each step points at a pseudocode line that does that operation
  - BFS, Bidirectional BFS, Dijkstra and A* agree on path length on unweighted grids, and Dijkstra and A* agree on cost on weighted grids
  - every path is a valid walk, and both maze generators leave the board fully connected
- **Cheap random access**: the sorting timeline stores a snapshot every 256 steps, so scrubbing to any step replays at most 255 operations
- **The grid never re-renders as a React tree**: a small `Board` controller paints cells by writing `className` (only when it changes), batches animation with `requestAnimationFrame`, and exposes a tiny snapshot through `useSyncExternalStore`. A full-size animated run measured under 2 ms of JavaScript per frame
- Accessible:
  - labelled controls, WAI-ARIA tabs and radio groups with arrow-key support, and a native `<dialog>` guide
  - keyboard shortcuts (Space, ←/→, Home/End, R, N)
  - a keyboard-drivable grid (arrows move a cursor; Space, W, S and T edit it) with screen-reader announcements
- Respects `prefers-reduced-motion`: cell keyframes are disabled and mazes appear instantly
- Settings and your grid are saved in `localStorage` under versioned keys and parsed defensively; the mode is in the URL hash (`#sorting`, `#pathfinding`)

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check + production build
npm run lint      # oxlint
npm test          # algorithm correctness checks (Node ≥ 22.18, runs the .ts file natively)
```

No environment variables are needed.

## Structure

```
scripts/
└── verify-algorithms.ts        # npm test — correctness checks for every algorithm
src/
├── algorithms/                 # pure TypeScript, no React
│   ├── sorting/
│   │   ├── tracer.ts           # records compare / swap / write / pivot / sorted steps
│   │   ├── timeline.ts         # random access over a run (checkpointed replay)
│   │   ├── bubble.ts … shell.ts  # one file per algorithm: implementation + pseudocode + facts
│   │   └── inputs.ts           # input presets and a seeded PRNG
│   └── pathfinding/
│       ├── grid.ts             # grid model, neighbours, path cost
│       ├── bfs.ts, dfs.ts, bidirectional.ts
│       ├── bestFirst.ts        # Dijkstra, A* and Greedy share one priority-queue search
│       ├── minHeap.ts          # binary heap with deterministic tie-breaking
│       └── mazes.ts            # recursive division, DFS maze, random walls / weights
├── components/
│   ├── sorting/                # toolbar, single & race stages, bars, transport, info panel
│   ├── pathfinding/
│   │   ├── board.ts            # imperative grid controller (painting, input, animation)
│   │   ├── BoardGrid.tsx       # renders the cells once; Board paints them
│   │   └── PathfindingView.tsx # toolbar, stats, legend
│   ├── ui/                     # select, range, segmented control, button, icons
│   ├── Header.tsx, Footer.tsx, HowToDialog.tsx
├── lib/                        # storage, hooks, utils
└── index.css                   # Tailwind v4 theme, form controls, grid cell styles
```
