import katex from 'katex'
import 'katex/dist/katex.min.css'
import { useMemo } from 'react'

/** KaTeX-rendered math (inline by default). */
export function Tex({ children, block }: { children: string; block?: boolean }) {
  const html = useMemo(() => katex.renderToString(children, { displayMode: !!block, throwOnError: false, strict: false }), [children, block])
  return block ? <div className="katex-block overflow-x-auto py-1" dangerouslySetInnerHTML={{ __html: html }} /> : <span dangerouslySetInnerHTML={{ __html: html }} />
}
