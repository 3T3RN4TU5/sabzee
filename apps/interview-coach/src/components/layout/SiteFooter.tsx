import { Lock } from "lucide-react";
import { GithubIcon } from "@/components/ui/icons";

const REPO_URL = "https://github.com/3T3RN4TU5/sabzee/tree/main/apps/interview-coach";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.06] print:hidden">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-zinc-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="flex items-center gap-2">
          <Lock className="size-4 shrink-0 text-zinc-500" aria-hidden />
          Your interviews are stored only in this browser.
        </p>
        <div className="flex items-center gap-4">
          <span>
            Built by <span className="text-zinc-200">Jeevan</span> with Next.js &amp; Claude
          </span>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md text-zinc-300 transition hover:text-white"
          >
            <GithubIcon className="size-4" />
            Source
          </a>
        </div>
      </div>
    </footer>
  );
}
