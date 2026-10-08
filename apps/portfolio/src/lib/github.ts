import { cacheLife } from "next/cache";

export interface GitHubSummary {
  login: string;
  avatarUrl: string;
  htmlUrl: string;
  publicRepos: number;
  followers: number;
  stars: number;
  languages: { name: string; count: number }[];
  recent: { name: string; description: string | null; url: string; language: string | null; stars: number; pushedAt: string }[];
}

interface ApiRepo {
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  pushed_at: string;
  fork: boolean;
}

/** Live GitHub stats, cached for hours so builds and visitors don't hit the API rate limit. Returns null on failure. */
export async function getGitHubSummary(login: string): Promise<GitHubSummary | null> {
  "use cache";
  cacheLife("hours");

  try {
    const headers = { Accept: "application/vnd.github+json", "User-Agent": "portfolio-site" };
    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${login}`, { headers }),
      fetch(`https://api.github.com/users/${login}/repos?per_page=100&sort=pushed`, { headers }),
    ]);
    if (!userRes.ok || !reposRes.ok) return null;
    const user = (await userRes.json()) as { login: string; avatar_url: string; html_url: string; public_repos: number; followers: number };
    const repos = ((await reposRes.json()) as ApiRepo[]).filter((r) => !r.fork);

    const langs = new Map<string, number>();
    for (const r of repos) if (r.language) langs.set(r.language, (langs.get(r.language) ?? 0) + 1);

    return {
      login: user.login,
      avatarUrl: user.avatar_url,
      htmlUrl: user.html_url,
      publicRepos: user.public_repos,
      followers: user.followers,
      stars: repos.reduce((s, r) => s + r.stargazers_count, 0),
      languages: [...langs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, count]) => ({ name, count })),
      recent: repos.slice(0, 6).map((r) => ({
        name: r.name,
        description: r.description,
        url: r.html_url,
        language: r.language,
        stars: r.stargazers_count,
        pushedAt: r.pushed_at,
      })),
    };
  } catch {
    return null;
  }
}
