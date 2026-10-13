# 🚀 Jeevan's Project Portfolio

[![CI](https://github.com/Jeevan2410/sabzee/actions/workflows/ci.yml/badge.svg)](https://github.com/Jeevan2410/sabzee/actions/workflows/ci.yml)

Ten production-ready web applications built with **React 19, Next.js 16, TypeScript and Tailwind CSS v4** — AI-powered tools, real-time collaboration, developer tools and dashboards — each one live on Vercel with automatic deployments on every push to `main`.

| App | What it is | Stack | Live | Repo |
| --- | --- | --- | --- | --- |
| 🤖 **AI Interview Coach** | AI mock interviews by role & level: streamed questions, rubric-scored feedback, readiness report | Next.js 16, Claude API, Zod | [Open](https://ai-interview-coach-jeevan.vercel.app) | [`ai-interview-coach`](https://github.com/Jeevan2410/ai-interview-coach) |
| 🧑‍💻 **CodeArena** | LeetCode-style practice: CodeMirror editor, tests run in a sandboxed Web Worker, hints & progress | React, CodeMirror 6, Web Workers | [Open](https://codearena-jeevan.vercel.app) | [`codearena`](https://github.com/Jeevan2410/codearena) |
| 📊 **AlgoViz** | Step-through sorting visualizer and pathfinding playground (BFS, Dijkstra, A*, mazes) | React, TypeScript | [Open](https://algoviz-jeevan.vercel.app) | [`algoviz`](https://github.com/Jeevan2410/algoviz) |
| 💬 **DevChat** | Real-time chat rooms with presence, typing indicators and RLS-secured Postgres | React, Supabase Realtime | [Open](https://devchat-jeevan.vercel.app) | [`devchat`](https://github.com/Jeevan2410/devchat) |
| 👋 **Portfolio** | Personal developer site with live GitHub stats | Next.js 16, Cache Components | [Open](https://jeevan-portfolio.vercel.app) | [`portfolio.`](https://github.com/Jeevan2410/portfolio.) |
| ⚡ **TaskFlow** | Trello-style Kanban with drag & drop, labels, checklists, insights, dark mode | React, dnd-kit, Zustand | [Open](https://taskflow-kanban-jeevan.vercel.app) | [`taskflow-kanban`](https://github.com/Jeevan2410/taskflow-kanban) |
| 💸 **FinTrack** | Personal finance dashboard: charts, budgets, CSV import/export | React, Recharts | [Open](https://fintrack-jeevan.vercel.app) | [`fintrack-dashboard`](https://github.com/Jeevan2410/fintrack-dashboard) |
| ✨ **ResumeForge** | Resume builder: live A4 preview, 3 templates, strength score, PDF export | React, Print CSS | [Open](https://resumeforge-jeevan.vercel.app) | [`resumeforge`](https://github.com/Jeevan2410/resumeforge) |
| 🔭 **GitScope** | GitHub profile analytics with charts and a recruiter-readiness checklist | React, GitHub API, Recharts | [Open](https://gitscope-jeevan.vercel.app) | [`gitscope`](https://github.com/Jeevan2410/gitscope) |
| 🥬 **Sabzee** | Quick-commerce grocery store: filters, cart, coupons, checkout, order tracking, REST API | Next.js 16, Zustand | [Open](https://sabzee.vercel.app) | [`sabzee-store`](https://github.com/Jeevan2410/sabzee-store) |

## What these projects demonstrate

- **AI engineering** — Claude API with streaming responses, schema-validated structured outputs, refusal fallbacks, input validation and rate limiting
- **Real-time & databases** — Supabase Realtime (Postgres changes, Presence, Broadcast), Row Level Security policies and trigger-based rate limits
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
├── chat/             Vite + React — real-time chat (Supabase)
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

Every app is a separate Vercel project linked to **its own repository** (see the Repo column above). Pushing to that repository's `main` branch deploys it to production, and pull requests get preview deployments.

**AI Interview Coach** runs in demo mode until you add an `ANTHROPIC_API_KEY` environment variable to its Vercel project (Settings → Environment Variables) and redeploy.

## Separate repositories

Each app is also published as its own repository (linked in the table above) and deployed from it. This monorepo stays the place to work across apps; `scripts/split-repos.sh` re-publishes an app's folder, with history, to its own repository.
