import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Building2, CalendarDays, CheckCircle2, Circle, ExternalLink, GitFork, Link2, MapPin, Search, Star, Users } from 'lucide-react'
import { compact, relativeTime, type Profile } from '../lib/github'
import { colorFor, computeInsights, sortRepos } from '../lib/insights'

const tooltip = { background: '#0f172a', border: '1px solid #334155', borderRadius: 12, fontSize: 12, color: '#e2e8f0' }

export function ProfileView({ profile }: { profile: Profile }) {
  const { user } = profile
  const ins = useMemo(() => computeInsights(profile), [profile])
  const [sort, setSort] = useState<'stars' | 'forks' | 'updated' | 'name'>('stars')
  const [lang, setLang] = useState('all')
  const [query, setQuery] = useState('')
  const [showForks, setShowForks] = useState(false)

  const repos = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sortRepos(
      profile.repos.filter(
        (r) =>
          (showForks || !r.fork) &&
          (lang === 'all' || r.language === lang) &&
          (!q || r.name.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q) || r.topics?.some((t) => t.includes(q))),
      ),
      sort,
    )
  }, [profile.repos, sort, lang, query, showForks])

  const stats = [
    { label: 'Public repos', value: compact(user.public_repos), icon: Circle },
    { label: 'Total stars', value: compact(ins.stars), icon: Star },
    { label: 'Total forks', value: compact(ins.forks), icon: GitFork },
    { label: 'Followers', value: compact(user.followers), icon: Users },
    { label: 'Top language', value: ins.topLanguage, icon: Circle },
    { label: 'Years on GitHub', value: ins.accountYears.toFixed(1), icon: CalendarDays },
  ]

  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
          <img src={user.avatar_url} alt={`${user.login}'s avatar`} className="h-28 w-28 rounded-full ring-4 ring-emerald-400/30" />
          <h2 className="mt-4 text-2xl font-extrabold text-white">{user.name ?? user.login}</h2>
          <a href={user.html_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-emerald-400 hover:underline">
            @{user.login} <ExternalLink className="h-3.5 w-3.5" />
          </a>
          {user.bio && <p className="mt-3 text-sm leading-relaxed text-slate-300">{user.bio}</p>}
          <ul className="mt-4 space-y-2 text-sm text-slate-400">
            {user.company && (
              <li className="flex items-center gap-2">
                <Building2 className="h-4 w-4" /> {user.company}
              </li>
            )}
            {user.location && (
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> {user.location}
              </li>
            )}
            {user.blog && (
              <li className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                <a href={user.blog.startsWith('http') ? user.blog : `https://${user.blog}`} target="_blank" rel="noreferrer" className="truncate hover:text-emerald-400">
                  {user.blog}
                </a>
              </li>
            )}
            <li className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" /> Joined {new Date(user.created_at).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
            </li>
            <li className="flex items-center gap-2">
              <Users className="h-4 w-4" /> <b className="text-white">{compact(user.followers)}</b> followers · <b className="text-white">{compact(user.following)}</b> following
            </li>
          </ul>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {stats.map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <Icon className="h-3.5 w-3.5" /> {label}
                </p>
                <p className="mt-1 truncate text-2xl font-extrabold text-white">{value}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white">Portfolio health</h3>
                <p className="text-xs text-slate-400">How recruiter-ready this profile looks</p>
              </div>
              <span className={`text-3xl font-extrabold ${ins.score >= 80 ? 'text-emerald-400' : ins.score >= 50 ? 'text-amber-400' : 'text-rose-400'}`}>{ins.score}%</span>
            </div>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {ins.checks.map((c) => (
                <li key={c.label} className="flex gap-2 text-sm" title={c.ok ? undefined : c.tip}>
                  {c.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-slate-600" />}
                  <span className={c.ok ? 'text-slate-300' : 'text-slate-500'}>
                    {c.label}
                    {!c.ok && <span className="block text-xs text-slate-500">{c.tip}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <ChartCard title="Languages" subtitle="By number of original repos">
          {ins.topLanguages.length ? (
            <div className="flex items-center gap-4">
              <div className="h-48 w-48 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={ins.topLanguages} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="95%" stroke="none" paddingAngle={2}>
                      {ins.topLanguages.map((l) => (
                        <Cell key={l.name} fill={l.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltip} itemStyle={{ color: '#e2e8f0' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="min-w-0 flex-1 space-y-1.5 text-sm">
                {ins.topLanguages.map((l) => (
                  <li key={l.name} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: l.color }} />
                    <span className="flex-1 truncate text-slate-300">{l.name}</span>
                    <span className="font-semibold text-white">{l.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <Empty />
          )}
        </ChartCard>

        <ChartCard title="Most starred" subtitle="Top original repositories">
          {ins.topRepos.some((r) => r.stargazers_count > 0) ? (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ins.topRepos.map((r) => ({ name: r.name, stars: r.stargazers_count, lang: r.language }))} layout="vertical" margin={{ left: 0, right: 12 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={118} tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(n: string) => (n.length > 16 ? `${n.slice(0, 15)}…` : n)} />
                  <Tooltip contentStyle={tooltip} cursor={{ fill: 'rgb(255 255 255 / 0.04)' }} />
                  <Bar dataKey="stars" radius={[0, 6, 6, 0]} maxBarSize={16}>
                    {ins.topRepos.map((r, i) => (
                      <Cell key={r.id} fill={colorFor(r.language ?? '', i)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <Empty text="No stars yet — share your projects!" />
          )}
        </ChartCard>

        <ChartCard title="Repos created per year" subtitle={`Since ${new Date(user.created_at).getFullYear()}`}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ins.activity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="year" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} width={28} />
                <Tooltip contentStyle={tooltip} cursor={{ fill: 'rgb(255 255 255 / 0.04)' }} />
                <Bar dataKey="repos" fill="#34d399" radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="mr-auto font-bold text-white">
            Repositories <span className="text-slate-500">({repos.length})</span>
          </h3>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a repository…"
              aria-label="Filter repositories"
              className="w-56 rounded-xl border border-white/10 bg-slate-900 py-2 pr-3 pl-9 text-sm text-white outline-none placeholder:text-slate-500 focus:border-emerald-400/60"
            />
          </div>
          <select value={lang} onChange={(e) => setLang(e.target.value)} aria-label="Language" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white">
            <option value="all">All languages</option>
            {ins.languages.map((l) => (
              <option key={l.name}>{l.name}</option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sort" className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white">
            <option value="stars">Most stars</option>
            <option value="forks">Most forks</option>
            <option value="updated">Recently pushed</option>
            <option value="name">Name</option>
          </select>
          <label className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-300">
            <input type="checkbox" checked={showForks} onChange={(e) => setShowForks(e.target.checked)} className="accent-emerald-500" /> Forks
          </label>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {repos.slice(0, 60).map((r) => (
            <a
              key={r.id}
              href={r.html_url}
              target="_blank"
              rel="noreferrer"
              className="group flex flex-col rounded-2xl border border-white/10 bg-slate-900/60 p-4 transition hover:-translate-y-0.5 hover:border-emerald-400/40"
            >
              <div className="flex items-center gap-2">
                <p className="truncate font-bold text-emerald-300 group-hover:underline">{r.name}</p>
                {r.fork && <span className="rounded-md border border-white/10 px-1.5 text-[10px] text-slate-400">fork</span>}
                {r.archived && <span className="rounded-md border border-amber-400/30 px-1.5 text-[10px] text-amber-300">archived</span>}
              </div>
              <p className="mt-1.5 line-clamp-2 flex-1 text-sm text-slate-400">{r.description ?? 'No description provided.'}</p>
              {r.topics && r.topics.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.topics.slice(0, 4).map((t) => (
                    <span key={t} className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                {r.language && (
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorFor(r.language) }} />
                    {r.language}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5" /> {compact(r.stargazers_count)}
                </span>
                <span className="flex items-center gap-1">
                  <GitFork className="h-3.5 w-3.5" /> {compact(r.forks_count)}
                </span>
                <span className="ml-auto">Updated {relativeTime(r.pushed_at)}</span>
              </div>
            </a>
          ))}
        </div>
        {repos.length === 0 && <p className="py-10 text-center text-sm text-slate-500">No repositories match.</p>}
        {repos.length > 60 && <p className="mt-4 text-center text-xs text-slate-500">Showing 60 of {repos.length} — refine the filters to see more.</p>}
      </section>
    </div>
  )
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
      <h3 className="font-bold text-white">{title}</h3>
      <p className="mb-4 text-xs text-slate-400">{subtitle}</p>
      {children}
    </div>
  )
}

function Empty({ text = 'Not enough data yet.' }: { text?: string }) {
  return <p className="grid h-48 place-items-center text-sm text-slate-500">{text}</p>
}
