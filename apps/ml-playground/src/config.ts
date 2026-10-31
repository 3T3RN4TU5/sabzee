export const PAGES = [
  { id: 'nn', label: 'Neural Net' },
  { id: 'optimizers', label: 'Optimizer Race' },
  { id: 'classical', label: 'Classical ML' },
  { id: 'unsupervised', label: 'Unsupervised' },
  { id: 'math', label: 'How it works' },
] as const

export type PageId = (typeof PAGES)[number]['id']
export const PAGE_IDS = PAGES.map((p) => p.id) as PageId[]

export const REPO_URL = 'https://github.com/3T3RN4TU5/ml-playground'
