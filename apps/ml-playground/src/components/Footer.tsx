import { REPO_URL } from '../config.ts'

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] py-6 text-center text-xs text-slate-500">
      Built from first principles in TypeScript by{' '}
      <a href="https://github.com/3T3RN4TU5" className="text-slate-300 hover:text-cyan-300" target="_blank" rel="noreferrer">
        Jeevan
      </a>{' '}
      · no ML libraries ·{' '}
      <a href={REPO_URL} className="text-slate-300 hover:text-cyan-300" target="_blank" rel="noreferrer">
        source on GitHub
      </a>
    </footer>
  )
}
