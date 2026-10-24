/**
 * Storage-only de-duplication of profile photos. A snapshot keeps a full copy of the resume data,
 * including `basics.photo` (a ~50–220 KB data URL), so 30 versions of a resume with a photo used to
 * cost ~30 copies of the same image in localStorage. In memory every snapshot still holds its own
 * photo (restoring stays a plain copy); only the persisted JSON replaces a repeated photo with a
 * short reference:
 *
 *   'rf-photo:doc'         the same image as the resume's current photo
 *   'rf-photo:snap:<id>'   the same image as an earlier (newer-first order) snapshot of that resume
 *
 * `unpackPhotos` runs on whatever comes out of storage before normalisation, so old (un-packed)
 * states load unchanged and are packed on the next write. Pure — no React, no DOM.
 */
import type { PersistedState, ResumeDoc, Snapshot } from '../lib/types.ts'

export const PHOTO_REF_PREFIX = 'rf-photo:'
const DOC_REF = `${PHOTO_REF_PREFIX}doc`
const snapRef = (id: string) => `${PHOTO_REF_PREFIX}snap:${id}`

const withPhoto = (snap: Snapshot, photo: string): Snapshot => ({ ...snap, data: { ...snap.data, basics: { ...snap.data.basics, photo } } })

function packDoc(doc: ResumeDoc): ResumeDoc {
  if (!doc.snapshots.length) return doc
  const seen = new Map<string, string>()
  if (doc.data.basics.photo) seen.set(doc.data.basics.photo, DOC_REF)
  let changed = false
  const snapshots = doc.snapshots.map((snap) => {
    const photo = snap.data?.basics?.photo
    if (!photo) return snap
    const ref = seen.get(photo)
    if (ref) {
      changed = true
      return withPhoto(snap, ref)
    }
    seen.set(photo, snapRef(snap.id))
    return snap
  })
  return changed ? { ...doc, snapshots } : doc
}

/** Replace repeated snapshot photos with references (for writing to storage). */
export function packPhotos(state: PersistedState): PersistedState {
  let changed = false
  const resumes = state.resumes.map((d) => {
    const p = packDoc(d)
    if (p !== d) changed = true
    return p
  })
  return changed ? { ...state, resumes } : state
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

function photoOf(data: unknown): string | undefined {
  if (!isObj(data) || !isObj(data.basics)) return undefined
  return typeof data.basics.photo === 'string' ? data.basics.photo : undefined
}

function unpackDoc(doc: unknown): unknown {
  if (!isObj(doc) || !Array.isArray(doc.snapshots)) return doc
  const docPhoto = photoOf(doc.data) ?? ''
  const byId = new Map<string, string>()
  let changed = false
  const snapshots = doc.snapshots.map((snap: unknown) => {
    if (!isObj(snap)) return snap
    const photo = photoOf(snap.data)
    let resolved = photo
    if (photo?.startsWith(PHOTO_REF_PREFIX)) {
      resolved = photo === DOC_REF ? docPhoto : (byId.get(photo) ?? '')
      changed = true
    }
    if (typeof snap.id === 'string' && resolved) byId.set(snapRef(snap.id), resolved)
    if (resolved === photo) return snap
    const data = snap.data as Record<string, unknown>
    return { ...snap, data: { ...data, basics: { ...(data.basics as Record<string, unknown>), photo: resolved } } }
  })
  return changed ? { ...doc, snapshots } : doc
}

/** Resolve photo references in a persisted state of any shape (unknown input is returned as is). */
export function unpackPhotos(persisted: unknown): unknown {
  if (!isObj(persisted) || !Array.isArray(persisted.resumes)) return persisted
  return { ...persisted, resumes: persisted.resumes.map(unpackDoc) }
}
