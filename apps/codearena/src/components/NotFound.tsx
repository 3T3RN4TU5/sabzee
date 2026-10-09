import { SearchX } from 'lucide-react'
import { FOCUS_RING } from '../lib/theme.ts'
import { EmptyState } from './ui.tsx'

export function NotFound({ slug, fallbackSlug }: { slug: string; fallbackSlug: string }) {
  return (
    <main className="flex min-h-0 flex-1 items-center justify-center p-6">
      <EmptyState icon={<SearchX className="size-5" />} title="Problem not found">
        <p>
          There is no problem called <code className="font-mono break-all text-ink">{slug}</code>. It may have been renamed — pick one from the
          problem list instead.
        </p>
        <a
          href={`#${fallbackSlug}`}
          className={`mt-4 inline-block rounded-md bg-accent px-4 py-2 text-sm font-semibold text-canvas hover:bg-accent-strong ${FOCUS_RING}`}
        >
          Back to problems
        </a>
      </EmptyState>
    </main>
  )
}
