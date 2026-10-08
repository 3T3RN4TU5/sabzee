import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Basics, Resume, SectionId, Settings } from './lib/types'
import { defaultSettings, emptyResume, sampleResume } from './lib/sample'

type ListKey = Exclude<keyof Resume, 'basics'>
type Item<K extends ListKey> = Resume[K][number]

interface State {
  resume: Resume
  settings: Settings
  setBasics: (patch: Partial<Basics>) => void
  addItem: <K extends ListKey>(key: K, item: Item<K>) => void
  updateItem: <K extends ListKey>(key: K, id: string, patch: Partial<Item<K>>) => void
  removeItem: (key: ListKey, id: string) => void
  moveItem: (key: ListKey, id: string, delta: -1 | 1) => void
  setSettings: (patch: Partial<Settings>) => void
  moveSection: (id: SectionId, delta: -1 | 1) => void
  toggleSection: (id: SectionId) => void
  loadResume: (r: Resume) => void
  loadSample: () => void
  clear: () => void
}

function move<T>(arr: T[], index: number, delta: number): T[] {
  const to = index + delta
  if (index < 0 || to < 0 || to >= arr.length) return arr
  const copy = [...arr]
  ;[copy[index], copy[to]] = [copy[to], copy[index]]
  return copy
}

export const useStore = create<State>()(
  persist(
    (set) => ({
      resume: sampleResume,
      settings: defaultSettings,
      setBasics: (patch) => set((s) => ({ resume: { ...s.resume, basics: { ...s.resume.basics, ...patch } } })),
      addItem: (key, item) => set((s) => ({ resume: { ...s.resume, [key]: [...s.resume[key], item] } })),
      updateItem: (key, id, patch) =>
        set((s) => ({
          resume: { ...s.resume, [key]: (s.resume[key] as { id: string }[]).map((x) => (x.id === id ? { ...x, ...patch } : x)) },
        })),
      removeItem: (key, id) => set((s) => ({ resume: { ...s.resume, [key]: (s.resume[key] as { id: string }[]).filter((x) => x.id !== id) } })),
      moveItem: (key, id, delta) =>
        set((s) => {
          const list = s.resume[key] as { id: string }[]
          return { resume: { ...s.resume, [key]: move(list, list.findIndex((x) => x.id === id), delta) } }
        }),
      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      moveSection: (id, delta) => set((s) => ({ settings: { ...s.settings, order: move(s.settings.order, s.settings.order.indexOf(id), delta) } })),
      toggleSection: (id) =>
        set((s) => ({
          settings: {
            ...s.settings,
            hidden: s.settings.hidden.includes(id) ? s.settings.hidden.filter((x) => x !== id) : [...s.settings.hidden, id],
          },
        })),
      loadResume: (resume) => set({ resume: { ...emptyResume, ...resume, basics: { ...emptyResume.basics, ...resume.basics } } }),
      loadSample: () => set({ resume: sampleResume }),
      clear: () => set({ resume: emptyResume }),
    }),
    { name: 'resumeforge-v1' },
  ),
)

export const uid = () => Math.random().toString(36).slice(2, 10)
