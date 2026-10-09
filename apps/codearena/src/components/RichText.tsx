import { Fragment } from 'react'

/**
 * A deliberately tiny "markdown-lite" renderer for the hand-written problem
 * text. It builds React elements (never HTML strings), so nothing is ever
 * injected with dangerouslySetInnerHTML.
 *
 * Blocks: a paragraph, or a list when every line starts with `- `.
 * Inline: `code`, **bold**, *italic* (bold/italic may contain code).
 */

const INLINE_TOKEN = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g

export function Inline({ text }: { text: string }) {
  const parts = text.split(INLINE_TOKEN)
  return (
    <>
      {parts.map((part, i) => {
        // `split` with a capture group puts matched tokens at odd indexes.
        if (i % 2 === 0) return <Fragment key={i}>{part}</Fragment>
        if (part.startsWith('`')) {
          return (
            <code key={i} className="rounded-md border border-line bg-raised px-1.5 py-px font-mono text-[0.85em] text-ink">
              {part.slice(1, -1)}
            </code>
          )
        }
        if (part.startsWith('**')) {
          return (
            <strong key={i} className="font-semibold text-ink">
              <Inline text={part.slice(2, -2)} />
            </strong>
          )
        }
        return (
          <em key={i}>
            <Inline text={part.slice(1, -1)} />
          </em>
        )
      })}
    </>
  )
}

function isList(block: string): boolean {
  return block.split('\n').every((line) => line.startsWith('- '))
}

export function RichText({ blocks, className = '' }: { blocks: string[]; className?: string }) {
  return (
    <div className={`space-y-3 ${className}`}>
      {blocks.map((block, i) =>
        isList(block) ? (
          <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-ink-faint">
            {block.split('\n').map((line, j) => (
              <li key={j}>
                <Inline text={line.slice(2)} />
              </li>
            ))}
          </ul>
        ) : (
          <p key={i}>
            <Inline text={block} />
          </p>
        ),
      )}
    </div>
  )
}
