/**
 * Inline-markdown renderer (**bold**, *italic*, `code`, [links](url)). User text is parsed into a
 * token tree (lib/markdown.ts) and rendered as React elements — never injected as HTML.
 */
import { useMemo, type CSSProperties, type ElementType, type ReactNode } from 'react'
import { parseInline, type Inline } from '../../lib/markdown.ts'

function render(nodes: Inline[], prefix: string, links: boolean): ReactNode[] {
  return nodes.map((n, i) => {
    const key = `${prefix}${i}`
    switch (n.type) {
      case 'text':
        return n.text
      case 'code':
        return (
          <code key={key} className="rf-code">
            {n.text}
          </code>
        )
      case 'strong':
        return <strong key={key}>{render(n.children, `${key}.`, links)}</strong>
      case 'em':
        return <em key={key}>{render(n.children, `${key}.`, links)}</em>
      case 'link':
        return links ? (
          <a key={key} className="rf-link" href={n.href} target="_blank" rel="noopener noreferrer">
            {render(n.children, `${key}.`, links)}
          </a>
        ) : (
          <span key={key}>{render(n.children, `${key}.`, links)}</span>
        )
    }
  })
}

export interface RichProps {
  text: string
  /** Wrapper element (default span). */
  as?: ElementType
  className?: string
  style?: CSSProperties
  /** Render [links](url) as anchors (default true). */
  links?: boolean
}

/** One line/paragraph of inline markdown. */
export function Rich({ text, as: Tag = 'span', className, style, links = true }: RichProps) {
  const nodes = useMemo(() => parseInline(text), [text])
  return (
    <Tag className={className} style={style}>
      {render(nodes, 'r', links)}
    </Tag>
  )
}

export interface RichParagraphsProps {
  text: string
  className?: string
  /** Class for each <p>. */
  paragraphClassName?: string
  style?: CSSProperties
  links?: boolean
}

/** Paragraphs separated by blank lines; single newlines become line breaks. */
export function RichParagraphs({ text, className, paragraphClassName, style, links = true }: RichParagraphsProps) {
  const paragraphs = useMemo(
    () =>
      text
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean),
    [text],
  )
  return (
    <div className={className ?? 'rf-paragraphs'} style={style}>
      {paragraphs.map((p, i) => (
        <p key={i} className={paragraphClassName ?? 'rf-p'}>
          {p.split('\n').map((line, j) => (
            <span key={j}>
              {j > 0 && <br />}
              {render(parseInline(line), `p${i}.${j}.`, links)}
            </span>
          ))}
        </p>
      ))}
    </div>
  )
}
