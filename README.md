# 🚀 Jeevan's Project Portfolio

[![CI](https://github.com/Jeevan2410/sabzee/actions/workflows/ci.yml/badge.svg)](https://github.com/Jeevan2410/sabzee/actions/workflows/ci.yml)

Nine production-ready web applications built with **React 19, Next.js 16, TypeScript and Tailwind CSS v4** — AI-powered tools, developer tools, dashboards and productivity apps — each one live on Vercel with automatic deployments on every push to `main`.

| App | What it is | Stack | Live | Code |
| --- | --- | --- | --- | --- |
| 🤖 **AI Interview Coach** | AI mock interviews by role & level: streamed questions, rubric-scored feedback, readiness report | Next.js 16, Claude API, Zod | [Open](https://ai-interview-coach-jeevan.vercel.app) | [`apps/interview-coach`](apps/interview-coach) |
| 🧑‍💻 **CodeArena** | LeetCode-style practice: CodeMirror editor, tests run in a sandboxed Web Worker, hints & progress | React, CodeMirror 6, Web Workers | [Open](https://codearena-jeevan.vercel.app) | [`apps/codearena`](apps/codearena) |
| 📊 **AlgoViz** | Step-through sorting visualizer and pathfinding playground (BFS, Dijkstra, A*, mazes) | React, TypeScript | [Open](https://algoviz-jeevan.vercel.app) | [`apps/algoviz`](apps/algoviz) |
| 👋 **Portfolio** | Personal developer site with live GitHub stats | Next.js 16, Cache Components | [Open](https://jeevan-portfolio.vercel.app) | [`apps/portfolio`](apps/portfolio) |
| ⚡ **TaskFlow** | Trello-style Kanban with drag & drop, labels, checklists, insights, dark mode | React, dnd-kit, Zustand | [Open](https://taskflow-kanban-jeevan.vercel.app) | [`apps/taskflow`](apps/taskflow) |
| 💸 **FinTrack** | Personal finance dashboard: charts, budgets, CSV import/export | React, Recharts | [Open](https://fintrack-jeevan.vercel.app) | [`apps/fintrack`](apps/fintrack) |
| ✨ **ResumeForge** | Resume builder: live A4 preview, 3 templates, strength score, PDF export | React, Print CSS | [Open](https://resumeforge-jeevan.vercel.app) | [`apps/resumeforge`](apps/resumeforge) |
| 🔭 **GitScope** | GitHub profile analytics with charts and a recruiter-readiness checklist | React, GitHub API, Recharts | [Open](https://gitscope-jeevan.vercel.app) | [`apps/gitscope`](apps/gitscope) |
| 🥬 **Sabzee** | Quick-commerce grocery store: filters, cart, coupons, checkout, order tracking, REST API | Next.js 16, Zustand | [Open](https://sabzee.vercel.app) | [`apps/sabzee`](apps/sabzee) |

## What these projects demonstrate

- **AI engineering** — Claude API with streaming responses, schema-validated structured outputs, refusal fallbacks, input validation and rate limiting
- **Developer tooling** — CodeMirror 6 editor, sandboxed Web Worker code execution with timeouts, step-through algorithm engines
- **Modern React & Next.js** — App Router, Server Components, Cache Components (`"use cache"`), static generation, Route Handlers, Suspense streaming
- **State management** — Zustand stores with `persist`, hydration-safe rendering, derived/memoised selectors
- **Real-world UX** — form validation, empty/loading/error states, toasts, keyboard support, responsive layouts, dark mode, print styles
- **Data visualisation** — Recharts bar, area and donut charts with custom tooltips
- **Working with APIs** — typed GitHub REST client with pagination, caching, abort signals and rate-limit handling
- **Quality & delivery** — strict TypeScript, ESLint / oxlint, GitHub Actions CI for every app, Vercel CI/CD with per-app ignored build steps, vendor code-splitting

## Repository layout

```
apps/
├── interview-coach/  Next.js 16 — AI mock interviews (Claude API)
├── codearena/        Vite + React — coding practice platform
├── algoviz/          Vite + React — algorithm visualizer
├── portfolio/        Next.js 16 — personal site
├── taskflow/         Vite + React — Kanban board
├── fintrack/         Vite + React — finance dashboard
├── resumeforge/      Vite + React — resume builder
├── gitscope/         Vite + React — GitHub analytics
└── sabzee/           Next.js 16 — e-commerce storefront
scripts/
└── split-repos.sh Publish each app as its own GitHub repository
```

Each app is fully independent (its own `package.json` and lockfile), so it can be developed, deployed or moved on its own.

## Run any app locally

```bash
cd apps/<app>
npm install
npm run dev
```

## Deployment

Every app is a separate Vercel project linked to this repository with its **Root Directory** set to `apps/<app>`. Pushing to `main` deploys to production; an ignored-build-step (`git diff --quiet HEAD^ HEAD -- . || exit 1`) means only the apps that actually changed are rebuilt.

**AI Interview Coach** runs in demo mode until you add an `ANTHROPIC_API_KEY` environment variable to its Vercel project (Settings → Environment Variables) and redeploy.

## Want separate repositories?

```bash
gh auth login               # once
./scripts/split-repos.sh    # creates ai-interview-coach, codearena, taskflow-kanban, … with full history
```
