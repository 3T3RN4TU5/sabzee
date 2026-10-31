import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, History, Loader2, Search, X } from 'lucide-react'
import { GithubIcon } from './components/GithubIcon'
import { fetchProfile, GitHubError, type Profile } from './lib/github'
import { ProfileView } from './components/ProfileView'

const suggestions = ['3T3RN4TU5', 'torvalds', 'gaearon', 'sindresorhus', 'yyx990803', 'kentcdodds']
const HISTORY_KEY = 'gitscope:history'

function loadHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

type Status = { kind: 'idle' } | { kind: 'loading'; login: string } | { kind: 'error'; message: string } | { kind: 'done'; profile: Profile }

export default function App() {
  const [input, setInput] = useState(() => new URLSearchParams(window.location.search).get('u') ?? '')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [history, setHistory] = useState<string[]>(loadHistory)

  const search = useCallback(async (raw: string, signal?: AbortSignal) => {
    const login = raw.trim().replace(/^@/, '').replace(/^https?:\/\/github\.com\//, '').split('/')[0]
    if (!/^[a-z\d](?:[a-z\d-]{0,38})$/i.test(login)) {
      setStatus({ kind: 'error', message: 'That doesn’t look like a valid GitHub username.' })
      return
    }
    setStatus({ kind: 'loading', login })
    const url = new URL(window.location.href)
    url.searchParams.set('u', login)
    window.history.replaceState(null, '', url)
    try {
      const profile = await fetchProfile(login, signal)
      setStatus({ kind: 'done', profile })
      setHistory((h) => {
        const next = [profile.user.login, ...h.filter((x) => x.toLowerCase() !== profile.user.login.toLowerCase())].slice(0, 6)
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
        return next
      })
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      setStatus({ kind: 'error', message: e instanceof GitHubError ? e.message : 'Network error — check your connection and try again.' })
    }
  }, [])

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get('u')
    if (!initial) return
    const ctrl = new AbortController()
    // Kick off the request for a shared ?u= link; state updates happen asynchronously.
    void Promise.resolve().then(() => search(initial, ctrl.signal))
    return () => ctrl.abort()
  }, [search])

  function go(login: string) {
    setInput(login)
    void search(login)
  }

  return (
    <div className="min-h-dvh bg-slate-950 text-slate-200">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-96 bg-[radial-gradient(ellipse_at_top,rgba(52,211,153,0.15),transparent_60%)]" />
      <header className="relative mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-5 sm:px-6">
        <button
          type="button"
          onClick={() => {
            setStatus({ kind: 'idle' })
            setInput('')
            window.history.replaceState(null, '', window.location.pathname)
          }}
          className="flex items-center gap-2.5"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400 text-slate-950">
            <GithubIcon className="h-5 w-5" />
          </span>
          <span className="text-left">
            <span className="block text-lg leading-none font-extrabold text-white">GitScope</span>
            <span className="text-[11px] text-slate-400">GitHub profile analytics</span>
          </span>
        </button>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void search(input)
          }}
          className="relative ml-auto w-full sm:w-96"
        >
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search a GitHub username…"
            aria-label="GitHub username"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            className="w-full rounded-2xl border border-white/10 bg-slate-900/80 py-3 pr-24 pl-10 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/60 focus:ring-4 focus:ring-emerald-400/10"
          />
          <button type="submit" className="absolute top-1.5 right-1.5 rounded-xl bg-emerald-400 px-4 py-1.5 text-sm font-bold text-slate-950 hover:bg-emerald-300">
            Analyze
          </button>
        </form>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 pb-16 sm:px-6">
        {status.kind === 'idle' && (
          <section className="mx-auto max-w-3xl py-16 text-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              Powered by the GitHub REST API
            </p>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
              Understand any developer&apos;s
              <span className="block bg-linear-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">GitHub in seconds.</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-slate-400">
              Languages, stars, activity and a recruiter-readiness checklist for any public profile. Perfect for polishing your own GitHub before a job hunt.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {suggestions.map((s) => (
                <button key={s} type="button" onClick={() => go(s)} className="rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2 text-sm font-semibold text-slate-300 transition hover:border-emerald-400/50 hover:text-white">
                  @{s}
                </button>
              ))}
            </div>
            {history.length > 0 && (
              <div className="mt-10">
                <p className="flex items-center justify-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  <History className="h-3.5 w-3.5" /> Recent searches
                </p>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  {history.map((h) => (
                    <span key={h} className="inline-flex items-center gap-1 rounded-full bg-white/5 pr-1 pl-3 text-sm">
                      <button type="button" onClick={() => go(h)} className="py-1 text-slate-300 hover:text-white">
                        {h}
                      </button>
                      <button
                        type="button"
                        aria-label={`Remove ${h}`}
                        onClick={() =>
                          setHistory((prev) => {
                            const next = prev.filter((x) => x !== h)
                            localStorage.setItem(HISTORY_KEY, JSON.stringify(next))
                            return next
                          })
                        }
                        className="rounded-full p-1 text-slate-500 hover:bg-white/10 hover:text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {status.kind === 'loading' && (
          <div className="grid place-items-center py-32 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
            <p className="mt-4 text-sm">Analyzing @{status.login}…</p>
          </div>
        )}

        {status.kind === 'error' && (
          <div className="mx-auto mt-16 max-w-lg rounded-3xl border border-rose-400/20 bg-rose-400/5 p-8 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-rose-400" />
            <p className="mt-4 font-semibold text-white">{status.message}</p>
            <button type="button" onClick={() => setStatus({ kind: 'idle' })} className="mt-6 rounded-xl border border-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/5">
              Back to search
            </button>
          </div>
        )}

        {status.kind === 'done' && (
          <>
            <ProfileView key={status.profile.user.login} profile={status.profile} />
            {status.profile.rateRemaining !== null && (
              <p className="mt-6 text-center text-xs text-slate-600">GitHub API requests left this hour: {status.profile.rateRemaining} · results cached for 10 minutes</p>
            )}
          </>
        )}
      </main>
    </div>
  )
}
