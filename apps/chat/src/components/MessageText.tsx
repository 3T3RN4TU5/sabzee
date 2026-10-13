import { memo } from 'react'
import { tokenize } from '../lib/richText'

/** Renders user content as React text nodes only — never as HTML. */
export const MessageText = memo(function MessageText({ content }: { content: string }) {
  return (
    <div className="text-[15px] leading-relaxed break-words whitespace-pre-wrap text-slate-800 dark:text-slate-200">
      {tokenize(content).map((token, i) => {
        switch (token.kind) {
          case 'text':
            return <span key={i}>{token.value}</span>
          case 'code':
            return (
              <code key={i} className="rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-rose-600 dark:border-ink-700 dark:bg-ink-850 dark:text-rose-300">
                {token.value}
              </code>
            )
          case 'codeblock':
            return (
              <pre
                key={i}
                className="my-1.5 overflow-x-auto rounded-lg border border-slate-200 bg-slate-100 p-3 font-mono text-[13px] leading-snug whitespace-pre text-slate-800 dark:border-ink-700 dark:bg-ink-950 dark:text-slate-200"
              >
                {token.lang && <span className="mb-1 block text-[10px] font-semibold tracking-wider text-slate-400 uppercase select-none">{token.lang}</span>}
                <code>{token.value}</code>
              </pre>
            )
          case 'link':
            return (
              <a
                key={i}
                href={token.href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-violet-600 underline decoration-violet-600/30 underline-offset-2 hover:decoration-violet-600 dark:text-violet-400 dark:decoration-violet-400/30 dark:hover:decoration-violet-400"
              >
                {token.value}
              </a>
            )
        }
      })}
    </div>
  )
})
