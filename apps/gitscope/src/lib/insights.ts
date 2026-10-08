import type { Profile, Repo } from './github'

export const languageColors: Record<string, string> = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Go: '#00ADD8',
  Rust: '#dea584',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  HTML: '#e34c26',
  CSS: '#563d7c',
  SCSS: '#c6538c',
  Shell: '#89e051',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  'Jupyter Notebook': '#DA5B0B',
  Lua: '#000080',
  Elixir: '#6e4a7e',
  Haskell: '#5e5086',
  Scala: '#c22d40',
  R: '#198CE7',
  Astro: '#ff5a03',
  Zig: '#ec915c',
  MDX: '#fcb32c',
  Dockerfile: '#384d54',
}

const fallback = ['#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#60a5fa', '#f87171', '#2dd4bf']
export const colorFor = (lang: string, i = 0) => languageColors[lang] ?? fallback[i % fallback.length]

export function computeInsights({ user, repos }: Profile) {
  const own = repos.filter((r) => !r.fork)
  const stars = own.reduce((s, r) => s + r.stargazers_count, 0)
  const forks = own.reduce((s, r) => s + r.forks_count, 0)

  const langCount = new Map<string, number>()
  for (const r of own) if (r.language) langCount.set(r.language, (langCount.get(r.language) ?? 0) + 1)
  const languages = [...langCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({ name, value, color: colorFor(name, i) }))
  const topLanguages = languages.slice(0, 7)
  const otherCount = languages.slice(7).reduce((s, l) => s + l.value, 0)
  if (otherCount) topLanguages.push({ name: 'Other', value: otherCount, color: '#cbd5e1' })

  const topRepos = [...own].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 8)

  const years = new Map<number, number>()
  for (const r of repos) {
    const y = new Date(r.created_at).getFullYear()
    years.set(y, (years.get(y) ?? 0) + 1)
  }
  const firstYear = new Date(user.created_at).getFullYear()
  const lastYear = new Date().getFullYear()
  const activity = Array.from({ length: lastYear - firstYear + 1 }, (_, i) => ({ year: String(firstYear + i), repos: years.get(firstYear + i) ?? 0 }))

  const accountYears = Math.max(0, (Date.now() - new Date(user.created_at).getTime()) / (365.25 * 24 * 3600e3))
  const recentlyActive = own.filter((r) => Date.now() - new Date(r.pushed_at).getTime() < 90 * 24 * 3600e3).length
  const withDocs = own.filter((r) => r.description).length
  const withHomepage = own.filter((r) => r.homepage).length

  // A light-hearted, transparent "portfolio score" so users know what to improve.
  const checks = [
    { label: 'Has a bio', ok: Boolean(user.bio), tip: 'Add a one-line bio describing what you build.' },
    { label: '6+ original repositories', ok: own.length >= 6, tip: 'Publish more original projects (not forks).' },
    { label: 'Descriptions on 70%+ of repos', ok: own.length > 0 && withDocs / own.length >= 0.7, tip: 'Write a short description for every repository.' },
    { label: 'Live demo links', ok: withHomepage >= 2, tip: 'Set the "Website" field on repos that are deployed (e.g. to Vercel).' },
    { label: 'Active in the last 90 days', ok: recentlyActive >= 2, tip: 'Push to a couple of projects regularly.' },
    { label: '3+ languages', ok: languages.length >= 3, tip: 'Show breadth with projects in different languages.' },
  ]
  const score = Math.round((checks.filter((c) => c.ok).length / checks.length) * 100)

  return {
    own,
    stars,
    forks,
    languages,
    topLanguages,
    topRepos,
    activity,
    accountYears,
    recentlyActive,
    checks,
    score,
    topLanguage: languages[0]?.name ?? '—',
  }
}

export type Insights = ReturnType<typeof computeInsights>

export function sortRepos(repos: Repo[], by: 'stars' | 'forks' | 'updated' | 'name'): Repo[] {
  const copy = [...repos]
  switch (by) {
    case 'stars':
      return copy.sort((a, b) => b.stargazers_count - a.stargazers_count)
    case 'forks':
      return copy.sort((a, b) => b.forks_count - a.forks_count)
    case 'updated':
      return copy.sort((a, b) => b.pushed_at.localeCompare(a.pushed_at))
    case 'name':
      return copy.sort((a, b) => a.name.localeCompare(b.name))
  }
}
