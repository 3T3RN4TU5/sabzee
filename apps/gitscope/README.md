# 🔭 GitScope — GitHub profile analytics

Type any GitHub username and get an instant dashboard: languages, stars, forks, yearly activity, a searchable repository explorer and a **portfolio health checklist** that tells developers what to improve before a job hunt.

**Tech:** React 19 · TypeScript · Vite · Recharts · Tailwind CSS v4 · GitHub REST API · Lucide icons

## Features

- Profile card with bio, company, location, website and follower stats
- KPIs: public repos, total stars & forks (original repos only), top language, years on GitHub
- **Charts** — language distribution donut, most-starred repositories, repos created per year
- **Repository explorer** — search by name / description / topic, filter by language, sort by stars, forks, recent push or name, toggle forks
- **Portfolio health score** — six transparent checks (bio, original repos, descriptions, live demo links, recent activity, language breadth) with tips
- Shareable URLs (`?u=username`), recent-search history, 10-minute `sessionStorage` cache to stay within the 60 req/hour unauthenticated limit
- Friendly handling of invalid usernames, 404s, rate limiting (with reset countdown) and network errors; requests are cancelled with `AbortController`
- Vendor code split into cacheable `react` and `charts` chunks

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check + production build
npm run lint      # oxlint
```

No API key is required — the app calls GitHub's public REST API directly from the browser.

## Structure

```
src/
├── App.tsx                  # Search, routing via ?u=, loading / error states, history
├── lib/
│   ├── github.ts            # Typed API client, pagination, caching, errors
│   └── insights.ts          # Aggregations, language colours, health checks
└── components/
    ├── ProfileView.tsx      # Profile, KPIs, charts, repository explorer
    └── GithubIcon.tsx
```
