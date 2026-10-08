import { useState } from 'react'
import { CheckCircle2, ChevronDown, XCircle } from 'lucide-react'
import { useStore } from '../store'
import { analyse } from '../lib/score'

export function ScoreCard() {
  const resume = useStore((s) => s.resume)
  const [open, setOpen] = useState(false)
  const { score, checks } = analyse(resume)
  const tone = score >= 80 ? '#10b981' : score >= 55 ? '#f59e0b' : '#ef4444'
  const r = 22
  const c = 2 * Math.PI * r
  const failed = checks.filter((x) => !x.passed)

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center gap-4 p-4 text-left">
        <svg width="56" height="56" viewBox="0 0 56 56" className="shrink-0 -rotate-90" aria-hidden>
          <circle cx="28" cy="28" r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
          <circle cx="28" cy="28" r={r} fill="none" stroke={tone} strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} className="transition-all duration-500" />
        </svg>
        <div className="flex-1">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">Resume strength</p>
          <p className="text-2xl font-extrabold" style={{ color: tone }}>
            {score}
            <span className="text-sm text-slate-400">/100</span>
          </p>
          <p className="text-xs text-slate-500">{failed.length ? `${failed.length} suggestion${failed.length > 1 ? 's' : ''} to improve` : 'Looking great — ready to apply! 🎉'}</p>
        </div>
        <ChevronDown className={`h-5 w-5 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul className="space-y-2 border-t border-slate-100 p-4">
          {[...failed, ...checks.filter((x) => x.passed)].map((check) => (
            <li key={check.label} className="flex gap-2.5 text-sm">
              {check.passed ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />}
              <div>
                <p className={`font-semibold ${check.passed ? 'text-slate-500' : 'text-slate-800'}`}>{check.label}</p>
                {!check.passed && <p className="text-xs text-slate-500">{check.tip}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
