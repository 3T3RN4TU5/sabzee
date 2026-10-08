import { ArrowUpRight, Star } from "lucide-react";
import { getGitHubSummary } from "@/lib/github";
import { profile } from "@/data/profile";
import { GithubIcon } from "./icons";

export async function GitHubActivity() {
  const data = await getGitHubSummary(profile.github);

  if (!data) {
    return (
      <a
        href={`https://github.com/${profile.github}`}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/[0.02] p-6 text-slate-300 hover:border-violet-400/40"
      >
        <span className="flex items-center gap-3">
          <GithubIcon className="h-6 w-6" /> See all my repositories on GitHub
        </span>
        <ArrowUpRight className="h-5 w-5" />
      </a>
    );
  }

  const total = data.languages.reduce((s, l) => s + l.count, 0) || 1;
  const colors = ["#a78bfa", "#22d3ee", "#34d399", "#fbbf24", "#f472b6", "#60a5fa"];

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-6">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- remote avatar, tiny and already optimised by GitHub */}
          <img src={data.avatarUrl} alt="" width={56} height={56} className="h-14 w-14 rounded-full ring-2 ring-violet-400/40" />
          <div>
            <p className="font-bold text-white">@{data.login}</p>
            <a href={data.htmlUrl} target="_blank" rel="noreferrer" className="text-sm text-violet-300 hover:underline">
              View profile →
            </a>
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-3 gap-3 text-center">
          {[
            ["Repos", data.publicRepos],
            ["Stars", data.stars],
            ["Followers", data.followers],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-white/[0.03] p-3">
              <dd className="text-xl font-bold text-white">{value}</dd>
              <dt className="text-xs text-slate-500">{label}</dt>
            </div>
          ))}
        </dl>
        {data.languages.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Top languages</p>
            <div className="mt-3 flex h-2.5 overflow-hidden rounded-full">
              {data.languages.map((l, i) => (
                <span key={l.name} style={{ width: `${(l.count / total) * 100}%`, backgroundColor: colors[i] }} />
              ))}
            </div>
            <ul className="mt-3 grid grid-cols-2 gap-1.5 text-xs text-slate-400">
              {data.languages.map((l, i) => (
                <li key={l.name} className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colors[i] }} />
                  {l.name} <span className="text-slate-600">{Math.round((l.count / total) * 100)}%</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {data.recent.map((r) => (
          <li key={r.name}>
            <a
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="group flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition hover:-translate-y-0.5 hover:border-violet-400/40"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate font-semibold text-white group-hover:text-violet-300">{r.name}</span>
                <ArrowUpRight className="h-4 w-4 shrink-0 text-slate-500 group-hover:text-violet-300" />
              </span>
              <span className="mt-2 line-clamp-2 flex-1 text-sm text-slate-400">{r.description ?? "No description yet."}</span>
              <span className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                {r.language && <span>{r.language}</span>}
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5" /> {r.stars}
                </span>
                <span className="ml-auto">
                  Pushed {new Date(r.pushedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GitHubActivitySkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="h-80 animate-pulse rounded-3xl bg-white/[0.03]" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-2xl bg-white/[0.03]" />
        ))}
      </div>
    </div>
  );
}
