import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { reconcileKeys } from '../src/features/editor/stableKeys.ts'
import { importJson } from '../src/lib/importer.ts'
import { MAX_JOB_DESCRIPTION, MAX_NAME, MAX_PHOTO_CHARS } from '../src/lib/normalize.ts'
import { makeDoc } from '../src/lib/samples.ts'
import type { PersistedState, ResumeDoc, Snapshot } from '../src/lib/types.ts'
import { packPhotos, PHOTO_REF_PREFIX, unpackPhotos } from '../src/store/photoPool.ts'
import { getActiveDoc, resumeActions as A, useResumeStore } from '../src/store/resumeStore.ts'

const PHOTO_A = 'data:image/png;base64,' + 'A'.repeat(400)
const PHOTO_B = 'data:image/png;base64,' + 'B'.repeat(400)

function snap(doc: ResumeDoc, id: string, photo: string): Snapshot {
  return { id, name: id, createdAt: 1, data: structuredClone({ ...doc.data, basics: { ...doc.data.basics, photo } }), design: { ...doc.design } }
}

function stateWithPhotos(): PersistedState {
  const doc = makeDoc('developer')
  doc.data.basics.photo = PHOTO_A
  doc.snapshots = [snap(doc, 's1', PHOTO_A), snap(doc, 's2', PHOTO_B), snap(doc, 's3', PHOTO_B), snap(doc, 's4', ''), snap(doc, 's5', PHOTO_A)]
  const other = makeDoc('blank')
  return { resumes: [doc, other], activeId: doc.id, theme: 'system' }
}

describe('photoPool', () => {
  it('pack → JSON → unpack round-trips to an identical state', () => {
    const state = stateWithPhotos()
    const packed = packPhotos(state)
    const json = JSON.stringify(packed)
    assert.ok(json.length < JSON.stringify(state).length, 'packed form is smaller')
    const photos = packed.resumes[0].snapshots.map((s) => s.data.basics.photo)
    assert.deepEqual(photos, [`${PHOTO_REF_PREFIX}doc`, PHOTO_B, `${PHOTO_REF_PREFIX}snap:s2`, '', `${PHOTO_REF_PREFIX}doc`])
    assert.deepEqual(unpackPhotos(JSON.parse(json)), JSON.parse(JSON.stringify(state)))
  })

  it('does not mutate the input and returns it unchanged when nothing repeats', () => {
    const state = stateWithPhotos()
    const before = JSON.stringify(state)
    packPhotos(state)
    assert.equal(JSON.stringify(state), before)
    const plain: PersistedState = { resumes: [makeDoc('developer')], activeId: null, theme: 'system' }
    assert.equal(packPhotos(plain), plain)
  })

  it('resolves an unknown snapshot reference to an empty photo', () => {
    const state = JSON.parse(JSON.stringify(stateWithPhotos()))
    state.resumes[0].snapshots[0].data.basics.photo = `${PHOTO_REF_PREFIX}snap:missing`
    const out = unpackPhotos(state) as PersistedState
    assert.equal(out.resumes[0].snapshots[0].data.basics.photo, '')
    assert.equal(out.resumes[0].snapshots[1].data.basics.photo, PHOTO_B)
  })

  it('passes old / odd shapes through', () => {
    assert.equal(unpackPhotos(null), null)
    const legacy = { data: { basics: {} } }
    assert.equal(unpackPhotos(legacy), legacy)
  })
})

describe('reconcileKeys (stable bullet keys)', () => {
  let n = 0
  const make = () => `new${++n}`

  it('keys follow their text when bullets move', () => {
    const keys = reconcileKeys(['a', 'b', 'c'], ['k1', 'k2', 'k3'], ['c', 'a', 'b'], make)
    assert.deepEqual(keys, ['k3', 'k1', 'k2'])
    assert.deepEqual(reconcileKeys(['a', 'b', 'c'], ['k1', 'k2', 'k3'], ['a', 'c', 'b'], make), ['k1', 'k3', 'k2'])
  })

  it('keeps the key for an in-place edit and mints one for an insertion', () => {
    assert.deepEqual(reconcileKeys(['a', 'b'], ['k1', 'k2'], ['a', 'b!'], make), ['k1', 'k2'])
    const ins = reconcileKeys(['a', 'b'], ['k1', 'k2'], ['a', 'x', 'b'], make)
    assert.equal(ins[0], 'k1')
    assert.equal(ins[2], 'k2')
    assert.ok(ins[1].startsWith('new'))
    assert.deepEqual(reconcileKeys(['a', 'b', 'c'], ['k1', 'k2', 'k3'], ['a', 'c'], make), ['k1', 'k3'])
  })

  it('handles duplicate text by nearest position', () => {
    assert.deepEqual(reconcileKeys(['x', 'y', 'x'], ['k1', 'k2', 'k3'], ['y', 'x', 'x'], make), ['k2', 'k1', 'k3'])
  })
})

describe('import caps end to end', () => {
  it('importJson → store.importDoc caps name, job description and oversized photos', () => {
    useResumeStore.setState({ resumes: [], activeId: null, history: {} })
    const data = makeDoc('developer').data
    const big = 'data:image/png;base64,' + 'A'.repeat(MAX_PHOTO_CHARS + 10)
    const imported = importJson({ $type: 'resumeforge', name: 'N'.repeat(MAX_NAME * 3), jobDescription: 'j'.repeat(MAX_JOB_DESCRIPTION + 500), data: { ...data, basics: { ...data.basics, photo: big } } })
    A.importDoc(imported)
    const doc = getActiveDoc()!
    assert.equal(doc.name.length, MAX_NAME)
    assert.equal(doc.jobDescription.length, MAX_JOB_DESCRIPTION)
    assert.equal(doc.data.basics.photo, '')
  })

  it('store.importDoc itself caps raw input that skipped the importer', () => {
    useResumeStore.setState({ resumes: [], activeId: null, history: {} })
    const data = makeDoc('developer').data
    A.importDoc({ format: 'resumeforge', name: 'x'.repeat(500), jobDescription: 'j'.repeat(MAX_JOB_DESCRIPTION * 2), data: { ...data, basics: { ...data.basics, photo: 'data:image/png;base64,' + 'A'.repeat(MAX_PHOTO_CHARS + 1) } } })
    const doc = getActiveDoc()!
    assert.equal(doc.name.length, MAX_NAME)
    assert.equal(doc.jobDescription.length, MAX_JOB_DESCRIPTION)
    assert.equal(doc.data.basics.photo, '')
    const ok = 'data:image/png;base64,' + 'A'.repeat(1000)
    A.importDoc({ format: 'resumeforge', name: 'ok', data: { ...data, basics: { ...data.basics, photo: ok } } })
    assert.equal(getActiveDoc()!.data.basics.photo, ok)
  })
})
