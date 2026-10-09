import { HardDrive } from 'lucide-react'
import { PORTFOLIO_URL, REPO_URL } from '../config.ts'
import { GithubIcon } from './ui/icons.tsx'

export function Footer() {
  return (
    <footer className="mt-10 border-t border-white/[0.06]">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="flex items-center gap-2">
          <HardDrive className="size-4 shrink-0 text-slate-500" aria-hidden />
          Your settings and grid are saved in this browser only.
        </p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <span>
            Built by{' '}
            <a href={PORTFOLIO_URL} target="_blank" rel="noreferrer" className="font-medium text-slate-200 hover:text-white">
              Jeevan
            </a>{' '}
            with React, TypeScript &amp; Tailwind CSS
          </span>
          <a href={REPO_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-slate-300 transition hover:text-white">
            <GithubIcon className="size-4" />
            Source
          </a>
        </div>
      </div>
    </footer>
  )
}
