# 🚀 Jeevan's Project Portfolio

[![CI](https://github.com/Jeevan2410/sabzee/actions/workflows/ci.yml/badge.svg)](https://github.com/Jeevan2410/sabzee/actions/workflows/ci.yml)

Six production-ready web applications built with **React 19, Next.js 16, TypeScript and Tailwind CSS v4** — each one live on Vercel with automatic deployments on every push to `main`.

| App | What it is | Stack | Live | Code |
| --- | --- | --- | --- | --- |
| 👋 **Portfolio** | Personal developer site with live GitHub stats | Next.js 16, Cache Components | [Open](https://jeevan-portfolio.vercel.app) | [`apps/portfolio`](apps/portfolio) |
| 🥬 **Sabzee** | Quick-commerce grocery store: filters, cart, coupons, checkout, order tracking, REST API | Next.js 16, Zustand | [Open](https://sabzee.vercel.app) | [`apps/sabzee`](apps/sabzee) |
| ⚡ **TaskFlow** | Trello-style Kanban with drag & drop, labels, checklists, insights, dark mode | React, dnd-kit, Zustand | [Open](https://taskflow-kanban-jeevan.vercel.app) | [`apps/taskflow`](apps/taskflow) |
| 💸 **FinTrack** | Personal finance dashboard: charts, budgets, CSV import/export | React, Recharts | [Open](https://fintrack-jeevan.vercel.app) | [`apps/fintrack`](apps/fintrack) |
| ✨ **ResumeForge** | Resume builder: live A4 preview, 3 templates, strength score, PDF export | React, Print CSS | [Open](https://resumeforge-jeevan.vercel.app) | [`apps/resumeforge`](apps/resumeforge) |
| 🔭 **GitScope** | GitHub profile analytics with charts and a recruiter-readiness checklist | React, GitHub API, Recharts | [Open](https://gitscope-jeevan.vercel.app) | [`apps/gitscope`](apps/gitscope) |

## What these projects demonstrate

- **Modern React & Next.js** — App Router, Server Components, Cache Components (`"use cache"`), static generation, Route Handlers, Suspense streaming
- **State management** — Zustand stores with `persist`, hydration-safe rendering, derived/memoised selectors
- **Real-world UX** — form validation, empty/loading/error states, toasts, keyboard support, responsive layouts, dark mode, print styles
- **Data visualisation** — Recharts bar, area and donut charts with custom tooltips
- **Working with APIs** — typed GitHub REST client with pagination, caching, abort signals and rate-limit handling
- **Quality & delivery** — strict TypeScript, ESLint / oxlint, GitHub Actions CI for every app, Vercel CI/CD with per-app ignored build steps, vendor code-splitting

## Repository layout

```
apps/
├── portfolio/     Next.js 16 — personal site
├── sabzee/        Next.js 16 — e-commerce storefront
├── taskflow/      Vite + React — Kanban board
├── fintrack/      Vite + React — finance dashboard
├── resumeforge/   Vite + React — resume builder
└── gitscope/      Vite + React — GitHub analytics
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

Every app is a separate Vercel project linked to this repository with its **Root Directory** set to `apps/<app>`. Pushing to `main` deploys to production; an ignored-build-step (`git diff --quiet HEAD^ HEAD -- .`) means only the apps that actually changed are rebuilt.

## Want separate repositories?

```bash
gh auth login               # once
./scripts/split-repos.sh    # creates taskflow-kanban, fintrack-dashboard, … with full history
```
