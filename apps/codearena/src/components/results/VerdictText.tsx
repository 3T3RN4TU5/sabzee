import type { Verdict } from '../../runner/verdict.ts'

const VERDICT_TONE: Record<Verdict, string> = {
  Accepted: 'text-pass',
  'Wrong Answer': 'text-fail',
  'Runtime Error': 'text-fail',
  'Compile Error': 'text-fail',
  'Time Limit Exceeded': 'text-medium',
}

export function VerdictText({ verdict, className = '' }: { verdict: Verdict; className?: string }) {
  return <span className={`${VERDICT_TONE[verdict]} ${className}`}>{verdict}</span>
}
