import { CircleCheck, CircleDashed } from 'lucide-react'
import type { ProblemStatus } from '../../lib/progress.ts'
import type { Problem } from '../../problems/types.ts'
import { formatValue } from '../../runner/format.ts'
import { Inline, RichText } from '../RichText.tsx'
import { DifficultyBadge } from '../ui.tsx'

export function DescriptionTab({ problem, status }: { problem: Problem; status: ProblemStatus }) {
  const examples = problem.tests.filter((test) => !test.hidden)

  return (
    <article className="animate-fade-in">
      <h1 className="text-xl font-semibold tracking-tight text-ink">
        {problem.id}. {problem.title}
      </h1>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <DifficultyBadge difficulty={problem.difficulty} />
        {status === 'solved' && (
          <span className="flex items-center gap-1 text-xs font-medium text-pass">
            <CircleCheck className="size-3.5" aria-hidden /> Solved
          </span>
        )}
        {status === 'attempted' && (
          <span className="flex items-center gap-1 text-xs font-medium text-medium">
            <CircleDashed className="size-3.5" aria-hidden /> Attempted
          </span>
        )}
        <span className="mx-1 h-4 w-px bg-line" aria-hidden />
        <ul className="flex flex-wrap gap-1.5" aria-label="Topics">
          {problem.tags.map((tag) => (
            <li key={tag} className="rounded-full bg-raised px-2.5 py-0.5 text-xs text-ink-muted">
              {tag}
            </li>
          ))}
        </ul>
      </div>

      <RichText blocks={problem.description} className="mt-5 text-[15px] leading-7 text-ink/90" />

      {examples.map((example, i) => (
        <section key={i} className="mt-6" aria-label={`Example ${i + 1}`}>
          <h2 className="mb-2 text-sm font-semibold text-ink">Example {i + 1}:</h2>
          <div className="space-y-1.5 rounded-r-lg border-l-2 border-line-strong bg-raised/40 py-2.5 pr-3 pl-4 text-sm leading-6">
            <p className="font-mono text-[13px] break-words">
              <span className="font-sans font-semibold text-ink">Input: </span>
              <span className="text-ink-muted">
                {problem.params.map((param, j) => `${param.name} = ${formatValue(example.input[j])}`).join(', ')}
              </span>
            </p>
            <p className="font-mono text-[13px] break-words">
              <span className="font-sans font-semibold text-ink">Output: </span>
              <span className="text-ink-muted">{formatValue(example.expected)}</span>
            </p>
            {example.explanation && (
              <p className="text-ink-muted">
                <span className="font-semibold text-ink">Explanation: </span>
                {example.explanation}
              </p>
            )}
          </div>
        </section>
      ))}

      <section className="mt-6" aria-label="Constraints">
        <h2 className="mb-2 text-sm font-semibold text-ink">Constraints:</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm text-ink-muted marker:text-ink-faint">
          {problem.constraints.map((constraint) => (
            <li key={constraint}>
              {constraint.includes('`') ? (
                <Inline text={constraint} />
              ) : (
                <code className="rounded-md border border-line bg-raised px-1.5 py-px font-mono text-[12.5px] text-ink">
                  {constraint}
                </code>
              )}
            </li>
          ))}
        </ul>
      </section>
    </article>
  )
}
