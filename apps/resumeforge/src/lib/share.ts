/**
 * Read-only share links: the resume is compressed into the URL hash (`#/view/<payload>`), so
 * nothing is uploaded anywhere — the link *is* the resume.
 */
import LZString from 'lz-string'
import { normalizeDesign } from './design.ts'
import { normalizeData } from './normalize.ts'
import type { Design, ResumeData } from './types.ts'

export interface SharePayload {
  data: ResumeData
  design: Design
}

const PREFIX = 'r1.'
export const SHARE_ROUTE = '#/view/'

export function encodeShare(payload: SharePayload, opts: { includePhoto?: boolean } = {}): string {
  const data = opts.includePhoto ? payload.data : { ...payload.data, basics: { ...payload.data.basics, photo: '' } }
  // ids are regenerated on decode — dropping them makes links ~15% shorter
  const slim = {
    v: 1,
    b: data.basics,
    s: data.sections.map((s) => ({ ...s, id: undefined, items: s.items.map((e) => ({ ...e, id: undefined })) })),
    d: payload.design,
  }
  return PREFIX + LZString.compressToEncodedURIComponent(JSON.stringify(slim))
}

export function decodeShare(encoded: string): SharePayload | null {
  try {
    const raw = encoded.startsWith(PREFIX) ? encoded.slice(PREFIX.length) : null
    if (!raw) return null
    const json = LZString.decompressFromEncodedURIComponent(raw)
    if (!json) return null
    const parsed = JSON.parse(json) as { v?: number; b?: unknown; s?: unknown; d?: unknown }
    if (parsed.v !== 1 || !parsed.b || !Array.isArray(parsed.s)) return null
    return { data: normalizeData({ basics: parsed.b, sections: parsed.s }), design: normalizeDesign(parsed.d) }
  } catch {
    return null
  }
}

export function shareUrl(base: string, payload: SharePayload, opts: { includePhoto?: boolean } = {}): string {
  return `${base.replace(/#.*$/, '')}${SHARE_ROUTE}${encodeShare(payload, opts)}`
}
