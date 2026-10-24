/**
 * The document store: every resume (data, design, cover letter, JD, snapshots), the active id and
 * the theme preference — persisted to localStorage['resumeforge-v1'] (zustand persist v2, migrating
 * the legacy single-resume state). Undo/redo history is kept per resume, in memory only.
 *
 * Actions live outside the state object (`resumeActions`), so components call them directly:
 *   resumeActions.updateEntry(sectionId, entryId, { title })
 * and subscribe to data with selectors / the hooks below.
 */
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { defaultDesign, normalizeDesign } from '../lib/design.ts'
import { emptyHistory, record, redo as redoHistory, undo as undoHistory, type History } from '../lib/history.ts'
import { uid } from '../lib/ids.ts'
import type { ImportedResume } from '../lib/importer.ts'
import { initialState, migratePersisted, STORAGE_KEY, STORE_VERSION } from '../lib/migrate.ts'
import { emptyCoverLetter, MAX_JOB_DESCRIPTION, MAX_NAME, normalizeData, normalizeDoc } from '../lib/normalize.ts'
import * as ops from '../lib/ops.ts'
import type { EntryPatch, SectionPatch } from '../lib/ops.ts'
import { makeDoc, type StarterKind } from '../lib/samples.ts'
import type { Basics, CoverLetter, Design, PersistedState, ResumeData, ResumeDoc, SectionKind, Snapshot, ThemePref } from '../lib/types.ts'
import { packPhotos, unpackPhotos } from './photoPool.ts'
import { persistStorage } from './storage.ts'

/** The part of a resume that undo/redo restores. */
export type UndoValue = Pick<ResumeDoc, 'data' | 'design' | 'coverLetter'>

export interface ResumeStoreState extends PersistedState {
  /** In-memory undo history per resume id (never persisted). */
  history: Record<string, History<UndoValue>>
}

export const MAX_SNAPSHOTS = 30

export const useResumeStore = create<ResumeStoreState>()(
  persist(() => ({ ...initialState(), history: {} }), {
    name: STORAGE_KEY,
    version: STORE_VERSION,
    storage: createJSONStorage(() => persistStorage),
    // Repeated snapshot photos are stored once (photoPool.ts); in memory every snapshot keeps its own copy.
    partialize: (s): PersistedState => packPhotos({ resumes: s.resumes, activeId: s.activeId, theme: s.theme }),
    migrate: (persisted, version) => migratePersisted(unpackPhotos(persisted), version),
    // Always normalise what comes out of storage (hand-edited / partially written JSON must not crash the app).
    merge: (persisted, current) => ({ ...current, ...migratePersisted(unpackPhotos(persisted), STORE_VERSION) }),
  }),
)

const get = useResumeStore.getState
const set = useResumeStore.setState

/** Flush pending localStorage writes (tests, before navigation). */
export const flushPersist = () => persistStorage.flush()

/* ---------------- internals ---------------- */

const undoValue = (d: ResumeDoc): UndoValue => ({ data: d.data, design: d.design, coverLetter: d.coverLetter })

const keyOf = (prefix: string, patch: object) => `${prefix}:${Object.keys(patch).sort().join(',')}`

interface CommitOptions {
  /** Coalescing key: consecutive commits with the same key within ~1.2 s form one undo step. null = never coalesce. */
  key?: string | null
  /** false = change is not recorded in undo history (rename, JD text, snapshots list). */
  undoable?: boolean
  /** Keep updatedAt untouched. */
  silent?: boolean
}

/** Apply `recipe` to one resume. Returning null / an identical patch is a no-op (no history, no re-render). */
function commit(docId: string | null | undefined, recipe: (doc: ResumeDoc) => Partial<ResumeDoc> | null, opts: CommitOptions = {}): void {
  if (!docId) return
  set((s) => {
    const idx = s.resumes.findIndex((r) => r.id === docId)
    if (idx < 0) return s
    const doc = s.resumes[idx]
    const patch = recipe(doc)
    if (!patch || (Object.keys(patch) as (keyof ResumeDoc)[]).every((k) => patch[k] === doc[k])) return s
    const next: ResumeDoc = { ...doc, ...patch, id: doc.id, updatedAt: opts.silent ? doc.updatedAt : Date.now() }
    const resumes = s.resumes.slice()
    resumes[idx] = next
    if (opts.undoable === false) return { resumes }
    const h = record(s.history[docId] ?? emptyHistory<UndoValue>(), undoValue(doc), opts.key ?? undefined, Date.now())
    return { resumes, history: { ...s.history, [docId]: h } }
  })
}

/** Edit the active resume's data. */
function editData(fn: (d: ResumeData) => ResumeData, key?: string | null): void {
  commit(get().activeId, (doc) => {
    const data = fn(doc.data)
    return data === doc.data ? null : { data }
  }, { key })
}

/** Like editData for ops that also return a new id. */
function editDataWithId(fn: (d: ResumeData) => { data: ResumeData; id: string }): string {
  let id = ''
  editData((d) => {
    const r = fn(d)
    id = r.id
    return r.data
  }, null)
  return id
}

function insertDoc(doc: ResumeDoc, activate: boolean): string {
  set((s) => ({ resumes: [...s.resumes, doc], activeId: activate || !s.activeId ? doc.id : s.activeId }))
  return doc.id
}

/* ---------------- actions ---------------- */

export interface DeletedResume {
  doc: ResumeDoc
  index: number
  wasActive: boolean
}

export interface CreateOptions {
  name?: string
  design?: Partial<Design>
  /** Make it the active resume (default true). */
  activate?: boolean
}

export const resumeActions = {
  /* ----- documents ----- */

  /** New resume from a starter ('developer' | 'researcher' | 'blank'). Returns its id. */
  createResume(starter: StarterKind = 'blank', opts: CreateOptions = {}): string {
    return insertDoc(makeDoc(starter, opts.name, opts.design), opts.activate ?? true)
  },

  /** Add an existing document (normalised; gets a fresh id if it collides). Returns its id. */
  addDoc(input: unknown, opts: { activate?: boolean } = {}): string {
    const doc = normalizeDoc(input)
    if (get().resumes.some((r) => r.id === doc.id)) doc.id = uid()
    return insertDoc(doc, opts.activate ?? true)
  },

  /** Add a resume from importer.ts `importJson()` output. Returns its id. */
  importDoc(imported: ImportedResume, opts: { activate?: boolean } = {}): string {
    const now = Date.now()
    return insertDoc(
      {
        id: uid(),
        name: (imported.name || '').trim().slice(0, MAX_NAME) || 'Imported resume',
        createdAt: now,
        updatedAt: now,
        data: normalizeData(imported.data),
        design: imported.design ?? { ...defaultDesign },
        coverLetter: imported.coverLetter ?? { ...emptyCoverLetter },
        jobDescription: (imported.jobDescription ?? '').slice(0, MAX_JOB_DESCRIPTION),
        snapshots: [],
      },
      opts.activate ?? true,
    )
  },

  /** Copy a resume (without its snapshots). Returns the new id; the copy becomes active. */
  duplicateResume(id: string, opts: { activate?: boolean } = {}): string {
    const src = get().resumes.find((r) => r.id === id)
    if (!src) return ''
    const now = Date.now()
    const copy: ResumeDoc = {
      ...src,
      id: uid(),
      name: `${src.name} (copy)`,
      createdAt: now,
      updatedAt: now,
      data: ops.cloneData(src.data),
      design: { ...src.design },
      coverLetter: { ...src.coverLetter },
      snapshots: [],
    }
    return insertDoc(copy, opts.activate ?? true)
  },

  renameResume(id: string, name: string): void {
    commit(id, () => ({ name: name.slice(0, MAX_NAME) }), { undoable: false })
  },

  /** Delete a resume; the most recently edited remaining one becomes active (or null). Returns what `restoreResume` needs to undo it. */
  deleteResume(id: string): DeletedResume | null {
    let removed: DeletedResume | null = null
    set((s) => {
      const index = s.resumes.findIndex((r) => r.id === id)
      if (index < 0) return s
      const resumes = s.resumes.filter((r) => r.id !== id)
      removed = { doc: s.resumes[index], index, wasActive: s.activeId === id }
      const history = { ...s.history }
      delete history[id]
      const activeId = s.activeId === id ? ([...resumes].sort((a, b) => b.updatedAt - a.updatedAt)[0]?.id ?? null) : s.activeId
      return { resumes, history, activeId }
    })
    return removed
  },

  /** Put a deleted resume back where it was (the "Undo" of a delete). */
  restoreResume(deleted: DeletedResume): void {
    set((s) => {
      if (s.resumes.some((r) => r.id === deleted.doc.id)) return s
      const resumes = s.resumes.slice()
      resumes.splice(Math.min(deleted.index, resumes.length), 0, deleted.doc)
      return { resumes, activeId: deleted.wasActive || !s.activeId ? deleted.doc.id : s.activeId }
    })
  },

  setActive(id: string): void {
    if (get().activeId !== id && get().resumes.some((r) => r.id === id)) set({ activeId: id })
  },

  /* ----- whole-document edits (undoable) ----- */

  /** Replace the active resume's data (and optionally design) — e.g. "load sample" / "clear". */
  replaceData(data: ResumeData, design?: Design): void {
    commit(get().activeId, () => (design ? { data, design: normalizeDesign(design) } : { data }), { key: null })
  },

  /* ----- basics ----- */

  updateBasics(patch: Partial<Basics>, key?: string | null): void {
    editData((d) => ops.updateBasics(d, patch), key === undefined ? keyOf('basics', patch) : key)
  },

  /** Set the photo and (optionally) design photo options as ONE undo step. */
  updatePhoto(photo: string, design?: Partial<Design>): void {
    commit(
      get().activeId,
      (doc) => {
        const data = ops.updateBasics(doc.data, { photo })
        const nextDesign = design ? normalizeDesign({ ...doc.design, ...design }) : doc.design
        const patch: Partial<ResumeDoc> = {}
        if (data !== doc.data) patch.data = data
        if (design && !ops.isNoopPatch(doc.design, nextDesign)) patch.design = nextDesign
        return Object.keys(patch).length ? patch : null
      },
      { key: null },
    )
  },

  /* ----- sections ----- */

  /** Add a section (or return the existing one for non-repeatable kinds). Returns the section id. */
  addSection(kind: SectionKind, opts: ops.AddSectionOptions = {}): string {
    return editDataWithId((d) => ops.addSection(d, kind, opts))
  },

  updateSection(sectionId: string, patch: SectionPatch, key?: string | null): void {
    editData((d) => ops.updateSection(d, sectionId, patch), key === undefined ? keyOf(`section:${sectionId}`, patch) : key)
  },

  removeSection(sectionId: string): void {
    editData((d) => ops.removeSection(d, sectionId), null)
  },

  duplicateSection(sectionId: string): string {
    return editDataWithId((d) => ops.duplicateSection(d, sectionId))
  },

  /** Move by index (dnd-kit `arrayMove` semantics). */
  moveSection(from: number, to: number): void {
    editData((d) => ops.moveSection(d, from, to), null)
  },

  /* ----- entries ----- */

  addEntry(sectionId: string, patch: EntryPatch = {}, index?: number): string {
    return editDataWithId((d) => ops.addEntry(d, sectionId, patch, index))
  },

  updateEntry(sectionId: string, entryId: string, patch: EntryPatch, key?: string | null): void {
    editData((d) => ops.updateEntry(d, sectionId, entryId, patch), key === undefined ? keyOf(`entry:${entryId}`, patch) : key)
  },

  removeEntry(sectionId: string, entryId: string): void {
    editData((d) => ops.removeEntry(d, sectionId, entryId), null)
  },

  duplicateEntry(sectionId: string, entryId: string): string {
    return editDataWithId((d) => ops.duplicateEntry(d, sectionId, entryId))
  },

  moveEntry(sectionId: string, from: number, to: number): void {
    editData((d) => ops.moveEntry(d, sectionId, from, to), null)
  },

  transferEntry(fromSectionId: string, entryId: string, toSectionId: string, index?: number): void {
    editData((d) => ops.transferEntry(d, fromSectionId, entryId, toSectionId, index), null)
  },

  /* ----- bullets ----- */

  addBullet(sectionId: string, entryId: string, text = '', index?: number): void {
    editData((d) => ops.addBullet(d, sectionId, entryId, text, index), null)
  },

  updateBullet(sectionId: string, entryId: string, index: number, text: string, key?: string | null): void {
    editData((d) => ops.updateBullet(d, sectionId, entryId, index, text), key === undefined ? `bullet:${entryId}:${index}` : key)
  },

  removeBullet(sectionId: string, entryId: string, index: number): void {
    editData((d) => ops.removeBullet(d, sectionId, entryId, index), null)
  },

  moveBullet(sectionId: string, entryId: string, from: number, to: number): void {
    editData((d) => ops.moveBullet(d, sectionId, entryId, from, to), null)
  },

  /* ----- design, cover letter, job description ----- */

  /** Merge into the active design (values are clamped/validated by normalizeDesign). */
  updateDesign(patch: Partial<Design>, key?: string | null): void {
    commit(
      get().activeId,
      (doc) => {
        const design = normalizeDesign({ ...doc.design, ...patch })
        return ops.isNoopPatch(doc.design, design) ? null : { design }
      },
      { key: key === undefined ? keyOf('design', patch) : key },
    )
  },

  updateCoverLetter(patch: Partial<CoverLetter>, key?: string | null): void {
    commit(
      get().activeId,
      (doc) => (ops.isNoopPatch(doc.coverLetter, patch) ? null : { coverLetter: { ...doc.coverLetter, ...patch } }),
      { key: key === undefined ? keyOf('letter', patch) : key },
    )
  },

  /** Not part of undo history (it is a scratch input for the JD matcher). */
  setJobDescription(text: string): void {
    commit(get().activeId, () => ({ jobDescription: text.slice(0, MAX_JOB_DESCRIPTION) }), { undoable: false, silent: true })
  },

  /* ----- snapshots (versions) ----- */

  /** Save the active resume's data+design as a named version (newest first, max 30). Returns its id. */
  saveSnapshot(name?: string): string {
    const id = uid()
    commit(
      get().activeId,
      (doc) => {
        const snap: Snapshot = { id, name: name?.trim() || `Version ${doc.snapshots.length + 1}`, createdAt: Date.now(), data: ops.cloneData(doc.data), design: { ...doc.design } }
        return { snapshots: [snap, ...doc.snapshots].slice(0, MAX_SNAPSHOTS) }
      },
      { undoable: false, silent: true },
    )
    return id
  },

  /** Replace data+design with a snapshot (undoable, so a mistaken restore can be undone). */
  restoreSnapshot(snapshotId: string): void {
    commit(
      get().activeId,
      (doc) => {
        const snap = doc.snapshots.find((x) => x.id === snapshotId)
        return snap ? { data: ops.cloneData(snap.data), design: { ...snap.design } } : null
      },
      { key: null },
    )
  },

  renameSnapshot(snapshotId: string, name: string): void {
    commit(get().activeId, (doc) => ({ snapshots: doc.snapshots.map((x) => (x.id === snapshotId ? { ...x, name: name.slice(0, MAX_NAME) } : x)) }), { undoable: false, silent: true })
  },

  deleteSnapshot(snapshotId: string): void {
    commit(get().activeId, (doc) => ({ snapshots: doc.snapshots.filter((x) => x.id !== snapshotId) }), { undoable: false, silent: true })
  },

  /* ----- undo / redo (active resume) ----- */

  undo(): boolean {
    const s = get()
    const id = s.activeId
    const doc = s.resumes.find((r) => r.id === id)
    if (!id || !doc) return false
    const res = undoHistory(s.history[id] ?? emptyHistory<UndoValue>(), undoValue(doc))
    if (!res) return false
    set({ resumes: s.resumes.map((r) => (r.id === id ? { ...r, ...res.value, updatedAt: Date.now() } : r)), history: { ...s.history, [id]: res.history } })
    return true
  },

  redo(): boolean {
    const s = get()
    const id = s.activeId
    const doc = s.resumes.find((r) => r.id === id)
    if (!id || !doc) return false
    const res = redoHistory(s.history[id] ?? emptyHistory<UndoValue>(), undoValue(doc))
    if (!res) return false
    set({ resumes: s.resumes.map((r) => (r.id === id ? { ...r, ...res.value, updatedAt: Date.now() } : r)), history: { ...s.history, [id]: res.history } })
    return true
  },

  canUndo(): boolean {
    const s = get()
    return !!s.activeId && (s.history[s.activeId]?.past.length ?? 0) > 0
  },

  canRedo(): boolean {
    const s = get()
    return !!s.activeId && (s.history[s.activeId]?.future.length ?? 0) > 0
  },

  /* ----- preferences ----- */

  setTheme(theme: ThemePref): void {
    if (get().theme !== theme) set({ theme })
  },
}

export type ResumeActions = typeof resumeActions

/* ---------------- selectors & hooks ---------------- */

export const selectActiveDoc = (s: ResumeStoreState): ResumeDoc | null => s.resumes.find((r) => r.id === s.activeId) ?? null

/** Non-hook access (event handlers, exports). */
export const getActiveDoc = (): ResumeDoc | null => selectActiveDoc(get())

export const useActiveDoc = (): ResumeDoc | null => useResumeStore(selectActiveDoc)
export const useActiveData = (): ResumeData | null => useResumeStore((s) => selectActiveDoc(s)?.data ?? null)
export const useActiveDesign = (): Design | null => useResumeStore((s) => selectActiveDoc(s)?.design ?? null)
export const useResumes = (): ResumeDoc[] => useResumeStore((s) => s.resumes)
export const useTheme = (): ThemePref => useResumeStore((s) => s.theme)

export function useHistoryState(): { canUndo: boolean; canRedo: boolean } {
  const canUndo = useResumeStore((s) => !!s.activeId && (s.history[s.activeId]?.past.length ?? 0) > 0)
  const canRedo = useResumeStore((s) => !!s.activeId && (s.history[s.activeId]?.future.length ?? 0) > 0)
  return { canUndo, canRedo }
}
