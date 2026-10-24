/**
 * Static checks for template folders (templates need a DOM to render, so behaviour is tested in the
 * browser via #/lab; this keeps the contract honest in CI): every src/templates/<id>/index.tsx must
 * export `meta` with a matching, valid id and a default component, and must not import the app-facing
 * barrel (that would create an import cycle through the registry).
 */
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import { isTemplateId } from '../src/lib/design.ts'

const root = join(import.meta.dirname, '..', 'src', 'templates')
const folders = readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== 'shared')
  .map((d) => d.name)

describe('template folders', () => {
  it('include the reference template', () => {
    assert.ok(folders.includes('modern'))
  })
  for (const folder of folders) {
    it(`${folder}/index.tsx follows the contract`, () => {
      const file = join(root, folder, 'index.tsx')
      assert.ok(existsSync(file), `${folder} has no index.tsx`)
      const src = readFileSync(file, 'utf8')
      assert.ok(isTemplateId(folder), `folder name "${folder}" must be a TemplateId (see src/lib/types.ts)`)
      assert.match(src, /export const meta\s*:\s*TemplateMeta\s*=/, 'export const meta: TemplateMeta = …')
      assert.match(src, new RegExp(`id:\\s*'${folder}'`), `meta.id must be '${folder}'`)
      assert.match(src, /export default function \w+/, 'default-export a function component')
      assert.match(src, /order:\s*\d+/, 'meta.order is required')
      assert.ok(!/from '\.\.\/(index|registry)(\.ts)?'/.test(src) && !/from '\.\.\/\.\.\/templates'/.test(src), 'import from ../shared, never ../index or ../registry')
      assert.ok(!/dangerouslySetInnerHTML/.test(src), 'no dangerouslySetInnerHTML in templates')
      for (const f of readdirSync(join(root, folder)).filter((f) => f.endsWith('.css'))) {
        const css = readFileSync(join(root, folder, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
        const selectors = css.match(/(^|})\s*([^{}@]+)\{/g) ?? []
        for (const sel of selectors) {
          const s = sel.replace(/^}/, '').replace(/\{$/, '').trim()
          if (!s || /^(from|to|\d+%)/.test(s)) continue
          for (const part of s.split(',')) assert.ok(part.trim().startsWith(`.rf-t-${folder}`), `${f}: selector "${part.trim()}" must be scoped with .rf-t-${folder}`)
        }
      }
    })
  }
})
