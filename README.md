# 🚀 Jeevan's Project Portfolio

[![CI](https://github.com/3T3RN4TU5/sabzee/actions/workflows/ci.yml/badge.svg)](https://github.com/3T3RN4TU5/sabzee/actions/workflows/ci.yml)

Fifteen live projects spanning **data analysis, machine learning, scientific computing and full-stack web development** — Python, pandas, scikit-learn, SQL/DuckDB, React 19, Next.js 16 and TypeScript — each deployed on Vercel with automatic deployments on every push to `main`.

| App | What it is | Stack | Live | Repo |
| --- | --- | --- | --- | --- |
| 🎯 **Churn Predictor ML** | End-to-end ML on IBM Telco: CV model selection, calibration, profit-optimal threshold, exact SHAP, browser inference | Python, scikit-learn, React | [Open](https://churn-predictor-ml-jeevan.vercel.app) | [`churn-predictor-ml`](https://github.com/3T3RN4TU5/churn-predictor-ml) |
| 📈 **Retail Sales Analytics** | 541k real transactions: ETL + data-quality checks, DuckDB star schema, cohorts, RFM/k-means, forecasting, A/B test, CLV | Python, pandas, DuckDB SQL | [Open](https://retail-sales-analytics-jeevan.vercel.app) | [`retail-sales-analytics`](https://github.com/3T3RN4TU5/retail-sales-analytics) |
| 🔍 **DataLens** | In-browser SQL analytics & automated EDA with DuckDB-WASM, profiling, chart/pivot builders, 1M-row grid | DuckDB-WASM, React | [Open](https://datalens-eda-jeevan.vercel.app) | [`datalens-eda`](https://github.com/3T3RN4TU5/datalens-eda) |
| 🧠 **ML Playground** | Autograd engine + ML algorithms from scratch: neural nets, optimizers, SVM, forests, PCA, t-SNE | TypeScript, Web Workers | [Open](https://ml-playground-jeevan.vercel.app) | [`ml-playground`](https://github.com/3T3RN4TU5/ml-playground) |
| 🔬 **SciSim Lab** | Verified numerical methods: RK45, symplectic integrators, N-body, PDEs, Ising, FFT, model fitting | TypeScript, numerics | [Open](https://sci-sim-lab-jeevan.vercel.app) | [`sci-sim-lab`](https://github.com/3T3RN4TU5/sci-sim-lab) |
| 🤖 **AI Interview Coach** | AI mock interviews by role & level: streamed questions, rubric-scored feedback, readiness report | Next.js 16, Claude API, Zod | [Open](https://ai-interview-coach-jeevan.vercel.app) | [`ai-interview-coach`](https://github.com/3T3RN4TU5/ai-interview-coach) |
| 🧑‍💻 **CodeArena** | LeetCode-style practice: CodeMirror editor, tests run in a sandboxed Web Worker, hints & progress | React, CodeMirror 6, Web Workers | [Open](https://codearena-jeevan.vercel.app) | [`codearena`](https://github.com/3T3RN4TU5/codearena) |
| 📊 **AlgoViz** | Step-through sorting visualizer and pathfinding playground (BFS, Dijkstra, A*, mazes) | React, TypeScript | [Open](https://algoviz-jeevan.vercel.app) | [`algoviz`](https://github.com/3T3RN4TU5/algoviz) |
| 💬 **DevChat** | Real-time chat rooms with presence, typing indicators and RLS-secured Postgres | React, Supabase Realtime | [Open](https://devchat-jeevan.vercel.app) | [`devchat`](https://github.com/3T3RN4TU5/devchat) |
| 👋 **Portfolio** | Personal developer site with live GitHub stats | Next.js 16, Cache Components | [Open](https://jeevan2410-portfolio.vercel.app) | [`portfolio.`](https://github.com/3T3RN4TU5/portfolio.) |
| ⚡ **TaskFlow** | Trello-style Kanban with drag & drop, labels, checklists, insights, dark mode | React, dnd-kit, Zustand | [Open](https://taskflow-kanban-jeevan.vercel.app) | [`taskflow-kanban`](https://github.com/3T3RN4TU5/taskflow-kanban) |
| 💸 **FinTrack** | Personal finance dashboard: charts, budgets, CSV import/export | React, Recharts | [Open](https://fintrack-jeevan.vercel.app) | [`fintrack-dashboard`](https://github.com/3T3RN4TU5/fintrack-dashboard) |
| ✨ **ResumeForge** | Resume builder: live A4 preview, 3 templates, strength score, PDF export | React, Print CSS | [Open](https://resumeforge-jeevan.vercel.app) | [`resumeforge`](https://github.com/3T3RN4TU5/resumeforge) |
| 🔭 **GitScope** | GitHub profile analytics with charts and a recruiter-readiness checklist | React, GitHub API, Recharts | [Open](https://gitscope-jeevan.vercel.app) | [`gitscope`](https://github.com/3T3RN4TU5/gitscope) |
| 🥬 **Sabzee** | Quick-commerce grocery store: filters, cart, coupons, checkout, order tracking, REST API | Next.js 16, Zustand | [Open](https://sabzee.vercel.app) | [`sabzee-store`](https://github.com/3T3RN4TU5/sabzee-store) |

## What these projects demonstrate

- **Data analysis** — Python ETL with data-quality gates, star-schema SQL with window functions, cohort/RFM/basket analysis, forecasting, A/B testing with power analysis, stakeholder reporting
- **Machine learning** — leakage-safe scikit-learn pipelines, cross-validation and tuning, calibration, cost-sensitive thresholds, SHAP explainability, model cards; autograd and classic algorithms implemented from scratch
- **Scientific computing** — ODE/PDE solvers with measured convergence orders, Barnes–Hut, Monte Carlo, FFT, cross-checked against SciPy
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
├── churn-predictor-ml/     Python + React — explainable churn model
├── retail-sales-analytics/ Python + DuckDB + React — analytics case study
├── datalens-eda/           React + DuckDB-WASM — in-browser SQL & EDA
├── ml-playground/          React — ML from first principles
├── sci-sim-lab/            React — verified numerical simulations
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
