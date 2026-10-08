export interface GitHubUser {
  login: string
  name: string | null
  avatar_url: string
  html_url: string
  bio: string | null
  company: string | null
  blog: string | null
  location: string | null
  twitter_username: string | null
  public_repos: number
  public_gists: number
  followers: number
  following: number
  created_at: string
}

export interface Repo {
  id: number
  name: string
  full_name: string
  html_url: string
  description: string | null
  fork: boolean
  language: string | null
  stargazers_count: number
  forks_count: number
  watchers_count: number
  open_issues_count: number
  topics?: string[]
  homepage: string | null
  created_at: string
  updated_at: string
  pushed_at: string
  archived: boolean
}

export interface Profile {
  user: GitHubUser
  repos: Repo[]
  rateRemaining: number | null
  fetchedAt: number
}

export class GitHubError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

const API = 'https://api.github.com'
const CACHE_TTL = 10 * 60 * 1000

async function get<T>(path: string, signal?: AbortSignal): Promise<{ data: T; remaining: number | null }> {
  const res = await fetch(`${API}${path}`, { headers: { Accept: 'application/vnd.github+json' }, signal })
  const remaining = res.headers.get('x-ratelimit-remaining')
  if (!res.ok) {
    if (res.status === 404) throw new GitHubError('No GitHub user found with that username.', 404)
    if (res.status === 403 || res.status === 429) {
      const reset = Number(res.headers.get('x-ratelimit-reset')) * 1000
      const mins = reset ? Math.max(1, Math.ceil((reset - Date.now()) / 60000)) : 60
      throw new GitHubError(`GitHub's public API rate limit was reached. Try again in about ${mins} minute${mins > 1 ? 's' : ''}.`, res.status)
    }
    throw new GitHubError(`GitHub API error (${res.status}). Please try again.`, res.status)
  }
  return { data: (await res.json()) as T, remaining: remaining === null ? null : Number(remaining) }
}

function readCache(login: string): Profile | null {
  try {
    const raw = sessionStorage.getItem(`gitscope:${login.toLowerCase()}`)
    if (!raw) return null
    const cached = JSON.parse(raw) as Profile
    return Date.now() - cached.fetchedAt < CACHE_TTL ? cached : null
  } catch {
    return null
  }
}

function writeCache(profile: Profile) {
  try {
    sessionStorage.setItem(`gitscope:${profile.user.login.toLowerCase()}`, JSON.stringify(profile))
  } catch {
    // Storage full or unavailable — caching is best-effort.
  }
}

export async function fetchProfile(login: string, signal?: AbortSignal): Promise<Profile> {
  const cached = readCache(login)
  if (cached) return cached

  const user = await get<GitHubUser>(`/users/${encodeURIComponent(login)}`, signal)
  const pages = Math.min(3, Math.max(1, Math.ceil(user.data.public_repos / 100)))
  const repoPages = await Promise.all(
    Array.from({ length: pages }, (_, i) => get<Repo[]>(`/users/${encodeURIComponent(login)}/repos?per_page=100&sort=pushed&page=${i + 1}`, signal)),
  )
  const profile: Profile = {
    user: user.data,
    repos: repoPages.flatMap((p) => p.data),
    rateRemaining: repoPages.at(-1)?.remaining ?? user.remaining,
    fetchedAt: Date.now(),
  }
  writeCache(profile)
  return profile
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 365 * 24 * 3600e3],
    ['month', 30 * 24 * 3600e3],
    ['week', 7 * 24 * 3600e3],
    ['day', 24 * 3600e3],
    ['hour', 3600e3],
    ['minute', 60e3],
  ]
  const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  for (const [unit, ms] of units) if (diff >= ms) return rtf.format(-Math.floor(diff / ms), unit)
  return 'just now'
}

export const compact = (n: number) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
