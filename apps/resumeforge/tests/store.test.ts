import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { importJson } from '../src/lib/importer.ts'
import { developerSample } from '../src/lib/samples.ts'
import { createThrottledStorage } from '../src/store/storage.ts'
import { getActiveDoc, resumeActions as A, useResumeStore } from '../src/store/resumeStore.ts'
import { uiActions, useUiStore } from '../src/store/uiStore.ts'

const active = () => getActiveDoc()!
const exp = () => active().data.sections.find((s) => s.kind === 'experience')!

describe('resume store', () => {
  beforeEach(() => {
    useResumeStore.setState({ resumes: [], activeId: null, history: {} })
    A.createResume('developer')
  })

  it('creates, duplicates, renames, activates and deletes resumes', () => {
    const first = active().id
    const second = A.createResume('blank', { name: 'Blank one' })
    assert.equal(useResumeStore.getState().resumes.length, 2)
    assert.equal(active().id, second)
    assert.equal(active().name, 'Blank one')
    const copy = A.duplicateResume(first)
    assert.equal(active().id, copy)
    assert.equal(active().name.endsWith('(copy)'), true)
    assert.deepEqual(active().data, useResumeStore.getState().resumes[0].data)
    assert.notEqual(active().data, useResumeStore.getState().resumes[0].data)
    A.renameResume(copy, 'Renamed')
    assert.equal(active().name, 'Renamed')
    A.setActive(first)
    assert.equal(active().id, first)
    A.deleteResume(first)
    assert.equal(useResumeStore.getState().resumes.length, 2)
    assert.ok(useResumeStore.getState().activeId && useResumeStore.getState().activeId !== first)
    A.deleteResume(useResumeStore.getState().resumes[0].id)
    A.deleteResume(useResumeStore.getState().resumes[0].id)
    assert.equal(useResumeStore.getState().activeId, null)
    A.updateBasics({ name: 'nobody' }) // no active resume: no-op, no crash
  })

  it('edits data through actions and bumps updatedAt', () => {
    const before = active().updatedAt
    A.updateBasics({ name: 'Riya Sen' })
    assert.equal(active().data.basics.name, 'Riya Sen')
    assert.ok(active().updatedAt >= before)
    const sid = exp().id
    const eid = A.addEntry(sid, { title: 'Contractor' }, 0)
    assert.equal(exp().items[0].id, eid)
    A.updateEntry(sid, eid, { subtitle: 'Self-employed' })
    A.addBullet(sid, eid, 'Shipped 3 client sites')
    assert.deepEqual(exp().items[0].bullets, ['', 'Shipped 3 client sites'])
    A.removeBullet(sid, eid, 0)
    A.updateBullet(sid, eid, 0, 'Shipped 4 client sites')
    assert.deepEqual(exp().items[0].bullets, ['Shipped 4 client sites'])
    A.moveEntry(sid, 0, 2)
    assert.equal(exp().items[2].id, eid)
    const awards = A.addSection('awards')
    assert.equal(A.addSection('awards'), awards)
    A.updateSection(awards, { title: 'Honours', hidden: true })
    assert.equal(active().data.sections.at(-1)!.title, 'Honours')
    A.removeSection(awards)
    assert.ok(!active().data.sections.some((s) => s.id === awards))
  })

  it('validates design patches', () => {
    A.updateDesign({ fontSize: 99, accent: 'not-a-colour', template: 'classic' })
    assert.equal(active().design.fontSize, 15)
    assert.equal(active().design.accent, '#4f46e5')
    assert.equal(active().design.template, 'classic')
  })

  it('undoes and redoes, coalescing rapid typing', () => {
    const original = active().data.basics.name
    A.updateBasics({ name: 'R' })
    A.updateBasics({ name: 'Ri' })
    A.updateBasics({ name: 'Riy' })
    A.updateBasics({ title: 'Designer' })
    assert.equal(A.canUndo(), true)
    assert.equal(A.undo(), true)
    assert.equal(active().data.basics.title, 'Full-Stack Developer')
    assert.equal(active().data.basics.name, 'Riy')
    A.undo()
    assert.equal(active().data.basics.name, original) // three keystrokes = one step
    assert.equal(A.canRedo(), true)
    A.redo()
    assert.equal(active().data.basics.name, 'Riy')
    A.updateDesign({ accent: '#0f766e' })
    assert.equal(A.canRedo(), false)
    A.undo()
    assert.equal(active().design.accent, '#4f46e5')
    // no-op edits do not create history entries
    const h = useResumeStore.getState().history[active().id].past.length
    A.updateBasics({ name: active().data.basics.name })
    assert.equal(useResumeStore.getState().history[active().id].past.length, h)
  })

  it('keeps history per resume', () => {
    const a = active().id
    A.updateBasics({ name: 'A edit' })
    const b = A.createResume('blank')
    assert.equal(A.canUndo(), false)
    A.setActive(a)
    assert.equal(A.canUndo(), true)
    A.setActive(b)
    assert.equal(A.undo(), false)
  })

  it('saves, restores and deletes snapshots', () => {
    const id = A.saveSnapshot('Before edits')
    assert.equal(active().snapshots[0].name, 'Before edits')
    A.updateBasics({ name: 'Changed' }, null)
    A.updateDesign({ template: 'minimal' })
    A.restoreSnapshot(id)
    assert.equal(active().data.basics.name, 'Aarav Mehta')
    assert.equal(active().design.template, 'modern')
    A.undo() // restore is undoable
    assert.equal(active().data.basics.name, 'Changed')
    A.renameSnapshot(id, 'v1')
    assert.equal(active().snapshots[0].name, 'v1')
    A.deleteSnapshot(id)
    assert.equal(active().snapshots.length, 0)
  })

  it('imports documents and cover letter / JD updates', () => {
    const imported = importJson({ basics: { name: 'Jane Doe', label: 'Designer' }, work: [{ name: 'Studio', position: 'Designer' }] })
    const id = A.importDoc(imported)
    assert.equal(active().id, id)
    assert.equal(active().data.basics.name, 'Jane Doe')
    A.updateCoverLetter({ company: 'Acme' })
    assert.equal(active().coverLetter.company, 'Acme')
    A.setJobDescription('We need React')
    assert.equal(active().jobDescription, 'We need React')
    const added = A.addDoc({ id, name: 'Same id', data: developerSample() })
    assert.notEqual(added, id)
  })
})

describe('ui store', () => {
  it('toasts, modals, confirm and zoom', async () => {
    const id = uiActions.toast('Saved', 'success', { duration: 0 })
    assert.equal(useUiStore.getState().toasts.at(-1)!.id, id)
    uiActions.dismissToast(id)
    assert.ok(!useUiStore.getState().toasts.some((t) => t.id === id))
    uiActions.openModal('import', { from: 'test' })
    assert.deepEqual(useUiStore.getState().modal, { id: 'import', props: { from: 'test' } })
    uiActions.closeModal()
    assert.equal(useUiStore.getState().modal, null)
    const p = uiActions.confirm({ title: 'Delete?' })
    assert.equal(useUiStore.getState().confirm!.title, 'Delete?')
    uiActions.resolveConfirm(true)
    assert.equal(await p, true)
    uiActions.setZoom(5)
    assert.equal(useUiStore.getState().zoom, 2)
    uiActions.setZoom('fit')
    assert.equal(useUiStore.getState().zoom, 'fit')
  })
})

describe('throttled storage', () => {
  it('batches writes and flushes', async () => {
    const backing = new Map<string, string>()
    const fake = { getItem: (k: string) => backing.get(k) ?? null, setItem: (k: string, v: string) => void backing.set(k, v), removeItem: (k: string) => void backing.delete(k) } as unknown as Storage
    const s = createThrottledStorage(() => fake, 20)
    s.setItem('k', '1')
    s.setItem('k', '2')
    assert.equal(backing.get('k'), undefined)
    assert.equal(s.getItem('k'), '2')
    await new Promise((r) => setTimeout(r, 40))
    assert.equal(backing.get('k'), '2')
    s.setItem('k', '3')
    s.flush()
    assert.equal(backing.get('k'), '3')
    const errors: unknown[] = []
    const failing = createThrottledStorage(() => ({ ...fake, setItem: () => { throw new Error('QuotaExceededError') } }) as unknown as Storage, 10)
    failing.onError = (e) => errors.push(e)
    failing.setItem('k', 'x')
    failing.flush()
    assert.equal(errors.length, 1)
  })
})
