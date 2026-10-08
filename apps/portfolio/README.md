# 👋 Developer portfolio

**Live demo:** [jeevan-portfolio.vercel.app](https://jeevan-portfolio.vercel.app)

A fast, dark-themed single-page portfolio that showcases my projects, skills and live GitHub activity.

**Tech:** Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind CSS v4 · Lucide icons

## Features

- Hero, about, projects, skills, live GitHub and contact sections with smooth scrolling and an active-section nav (`IntersectionObserver`)
- **Live GitHub stats** (repos, stars, followers, top languages, recently pushed repos) fetched on the server with `"use cache"` + `cacheLife("hours")` and streamed behind `<Suspense>` — gracefully falls back if the API is unavailable
- Project cards with highlights, tech stack, live demo and source links
- Optional `mailto:` contact form with validation (no backend or third-party service required)
- SEO: metadata, Open Graph tags, `sitemap.xml`, `robots.txt`, SVG app icon
- Respects `prefers-reduced-motion`; fully responsive with a mobile menu

## Make it yours

All personal content lives in **[`src/data/profile.ts`](src/data/profile.ts)** — name, role, about text, social links, skills and projects. Set `email` and `linkedin` there to enable the contact form and LinkedIn buttons.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
npm run build
npm run lint
```
