/**
 * Achievement bullets: sortable rows (drag or keyboard), Enter adds the next bullet, Backspace on an
 * empty one removes it, Alt+↑/↓ moves, multi-line paste splits into bullets, B/I/link toolbar and
 * the BulletHelper ("Ideas"). Every bullet registers with the focus mechanism. OWNER: shell agent.
 */
import { Lightbulb, Plus, X } from 'lucide-react'
import { Suspense, useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react'
import { BulletHelper } from '../../app/lazy.ts'
import type { Entry } from '../../lib/types.ts'
import { resumeActions, useFieldFocus } from '../../store'
import { Button, cn, IconButton, inputClass } from '../../ui'
import { handleMarkShortcut } from './markEdit.ts'
import { MarkToolbar } from './RichTextArea.tsx'
import { DragHandle, SortableItem, SortableList, type DragHandleProps } from './Sortable.tsx'

const MARKER = /^\s*(?:[-*•·▪◦‣–]|\d{1,2}[.)])\s+/

export function BulletsEditor({ sectionId, entry, label, hint, className }: { sectionId: string; entry: Entry; label: string; hint?: string; className?: string }) {
  const { ref, flash } = useFieldFocus<HTMLDivElement>({ sectionId, entryId: entry.id, field: 'bullets' })
  const [ideas, setIdeas] = useState(false)
  const list = useRef<HTMLUListElement>(null)
  const last = useRef<HTMLTextAreaElement | null>(null)
  const bullets = entry.bullets
  const ids = bullets.map((_, i) => `${entry.id}:b${i}`)

  const focusBullet = (i: number, caret: 'start' | 'end' = 'end') =>
    requestAnimationFrame(() => {
      const el = list.current?.querySelector<HTMLTextAreaElement>(`textarea[data-bullet="${i}"]`)
      if (!el) return
      el.focus()
      const p = caret === 'end' ? el.value.length : 0
      el.setSelectionRange(p, p)
    })

  const add = (index = bullets.length, text = '') => {
    resumeActions.addBullet(sectionId, entry.id, text, index)
    focusBullet(index)
  }
  const lastEmpty = bullets.length > 0 && !bullets[bullets.length - 1].trim()

  return (
    <div ref={ref} className={cn('min-w-0 rounded-lg', flash && 'ring-2 ring-indigo-400/70 ring-offset-2 ring-offset-white dark:ring-offset-slate-900', className)}>
      <div className="mb-1 flex flex-wrap items-center gap-1">
        <span className="mr-auto text-xs font-semibold text-slate-600 dark:text-slate-300">
          {label} {bullets.length > 0 && <span className="font-normal text-slate-400">· {bullets.filter((b) => b.trim()).length}</span>}
        </span>
        <MarkToolbar
          target={() => (last.current?.isConnected ? last.current : null)}
          commit={(el, v) => {
            const i = Number(el.dataset.bullet)
            if (Number.isInteger(i)) resumeActions.updateBullet(sectionId, entry.id, i, v, null)
          }}
        />
        <Button size="xs" variant={ideas ? 'subtle' : 'ghost'} icon={Lightbulb} onClick={() => setIdeas((v) => !v)} aria-expanded={ideas}>
          Ideas
        </Button>
      </div>
      {hint && <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      {bullets.length > 0 && (
        <SortableList ids={ids} noun="bullet" label={(id) => `bullet ${ids.indexOf(String(id)) + 1}`} onMove={(from, to) => resumeActions.moveBullet(sectionId, entry.id, from, to)}>
          <ul ref={list} className="space-y-1.5" aria-label={label}>
            {bullets.map((b, i) => (
              <SortableItem key={ids[i]} id={ids[i]} as="li">
                {(handle) => (
                  <BulletRow
                    sectionId={sectionId}
                    entry={entry}
                    index={i}
                    text={b}
                    handle={handle}
                    onFocusEl={(el) => (last.current = el)}
                    onAdd={add}
                    onFocusBullet={focusBullet}
                  />
                )}
              </SortableItem>
            ))}
          </ul>
        </SortableList>
      )}
      <Button size="xs" variant="subtle" icon={Plus} className="mt-2" onClick={() => add()}>
        Add bullet
      </Button>
      {ideas && (
        <div className="mt-2 rounded-xl bg-amber-50/60 p-2 ring-1 ring-amber-200/70 dark:bg-amber-500/5 dark:ring-amber-500/20">
          <Suspense fallback={<p className="p-2 text-xs text-slate-500">Loading ideas…</p>}>
            <BulletHelper sectionId={sectionId} entryId={entry.id} role={entry.title} bulletIndex={lastEmpty ? bullets.length - 1 : undefined} onDone={() => setIdeas(false)} />
          </Suspense>
        </div>
      )}
    </div>
  )
}

interface BulletRowProps {
  sectionId: string
  entry: Entry
  index: number
  text: string
  handle: DragHandleProps
  onFocusEl: (el: HTMLTextAreaElement) => void
  onAdd: (index: number, text?: string) => void
  onFocusBullet: (index: number, caret?: 'start' | 'end') => void
}

function BulletRow({ sectionId, entry, index, text, handle, onFocusEl, onAdd, onFocusBullet }: BulletRowProps) {
  const { ref, flash } = useFieldFocus<HTMLTextAreaElement>({ sectionId, entryId: entry.id, field: 'bullets', bullet: index })
  const count = entry.bullets.length
  const set = (v: string, key?: string | null) => resumeActions.updateBullet(sectionId, entry.id, index, v, key)

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (handleMarkShortcut(e, (v) => set(v, null))) return
    if (e.nativeEvent.isComposing) return
    const el = e.currentTarget
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault()
      // Split at the caret: the text after it moves to the new bullet.
      const at = el.selectionStart
      const before = el.value.slice(0, at).trimEnd()
      const after = el.value.slice(el.selectionEnd).trimStart()
      if (after) {
        const bullets = [...entry.bullets]
        bullets.splice(index, 1, before, after)
        resumeActions.updateEntry(sectionId, entry.id, { bullets }, null)
        onFocusBullet(index + 1, 'start')
      } else onAdd(index + 1)
    } else if (e.key === 'Backspace' && !el.value && el.selectionStart === 0) {
      e.preventDefault()
      resumeActions.removeBullet(sectionId, entry.id, index)
      if (count > 1) onFocusBullet(Math.max(0, index - 1))
    } else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      const to = e.key === 'ArrowUp' ? index - 1 : index + 1
      if (to < 0 || to >= count) return
      e.preventDefault()
      resumeActions.moveBullet(sectionId, entry.id, index, to)
      onFocusBullet(to)
    }
  }

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const raw = e.clipboardData.getData('text')
    if (!/\r?\n/.test(raw.trim())) return
    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.replace(MARKER, '').trim())
      .filter(Boolean)
    if (lines.length < 2) return
    e.preventDefault()
    const el = e.currentTarget
    const first = el.value.slice(0, el.selectionStart) + lines[0] + el.value.slice(el.selectionEnd)
    const bullets = [...entry.bullets]
    bullets.splice(index, 1, first, ...lines.slice(1))
    resumeActions.updateEntry(sectionId, entry.id, { bullets }, null)
    onFocusBullet(index + lines.length - 1)
  }

  const long = text.length > 200
  return (
    <div className="group/b flex items-start gap-1">
      <DragHandle handle={handle} label={`Reorder bullet ${index + 1}`} size="xs" className="mt-1" />
      <div className="min-w-0 flex-1">
        <textarea
          ref={ref}
          data-bullet={index}
          rows={1}
          value={text}
          aria-label={`Bullet ${index + 1}`}
          placeholder={index === 0 ? 'Led …, which resulted in …% …' : 'Another achievement'}
          onFocus={(e) => onFocusEl(e.currentTarget)}
          onChange={(e) => set(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          className={cn(inputClass, 'field-sizing-content min-h-9 resize-none py-1.5 leading-relaxed', flash && 'ring-2 ring-indigo-400')}
        />
        {long && <p className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-400">{text.length} characters — bullets over ~2 lines are often skimmed past.</p>}
      </div>
      <IconButton size="xs" icon={X} label={`Remove bullet ${index + 1}`} className="mt-1 opacity-60 group-hover/b:opacity-100 focus-visible:opacity-100" onClick={() => resumeActions.removeBullet(sectionId, entry.id, index)} />
    </div>
  )
}
