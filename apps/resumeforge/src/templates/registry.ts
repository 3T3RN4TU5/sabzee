/**
 * Auto-discovered template registry. Every `src/templates/<id>/index.tsx` that exports `meta` and a
 * default component is picked up — no shared file to edit when adding a template.
 */
import type { TemplateId } from '../lib/types.ts'
import type { TemplateDef, TemplateModule } from './types.ts'

const modules = import.meta.glob<TemplateModule>('./*/index.tsx', { eager: true })

function load(): TemplateDef[] {
  const defs: TemplateDef[] = []
  const seen = new Set<string>()
  for (const [path, mod] of Object.entries(modules)) {
    if (!mod?.meta || typeof mod.default !== 'function') {
      if (import.meta.env.DEV) console.warn(`[templates] ${path} must export \`meta\` and a default component`)
      continue
    }
    const folder = path.split('/')[1]
    if (folder !== mod.meta.id && import.meta.env.DEV) console.warn(`[templates] folder "${folder}" exports meta.id "${mod.meta.id}"`)
    if (seen.has(mod.meta.id)) continue
    seen.add(mod.meta.id)
    defs.push({ ...mod.meta, Component: mod.default })
  }
  return defs.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
}

/** All available templates, ordered by meta.order. */
export const TEMPLATES: readonly TemplateDef[] = load()

const BY_ID = new Map(TEMPLATES.map((t) => [t.id, t]))

export const FALLBACK_TEMPLATE: TemplateId = 'modern'

export function hasTemplate(id: string): id is TemplateId {
  return BY_ID.has(id as TemplateId)
}

/** Template by id, falling back to Modern (or the first template) when it does not exist yet. */
export function getTemplate(id: TemplateId | string | undefined): TemplateDef {
  return BY_ID.get(id as TemplateId) ?? BY_ID.get(FALLBACK_TEMPLATE) ?? TEMPLATES[0]
}
