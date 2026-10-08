import type { Board, Label, Task } from '../types'
import { todayISO } from './utils'

export const defaultLabels: Label[] = [
  { id: 'frontend', name: 'Frontend', color: '#6366f1' },
  { id: 'backend', name: 'Backend', color: '#0ea5e9' },
  { id: 'design', name: 'Design', color: '#ec4899' },
  { id: 'bug', name: 'Bug', color: '#ef4444' },
  { id: 'research', name: 'Research', color: '#f59e0b' },
  { id: 'devops', name: 'DevOps', color: '#10b981' },
]

const now = Date.now()

function t(id: string, partial: Partial<Task> & { title: string }): Task {
  return {
    id,
    description: '',
    priority: 'medium',
    labels: [],
    dueDate: null,
    checklist: [],
    createdAt: now,
    ...partial,
  }
}

export const seedTasks: Record<string, Task> = Object.fromEntries(
  [
    t('t1', { title: 'Design landing page hero', priority: 'high', labels: ['design', 'frontend'], dueDate: todayISO(2), description: 'Create 2 hero variants in Figma and get feedback from the team.', checklist: [{ id: 'c1', text: 'Moodboard', done: true }, { id: 'c2', text: 'Wireframes', done: true }, { id: 'c3', text: 'Hi-fi mockups', done: false }] }),
    t('t2', { title: 'Set up CI/CD pipeline', priority: 'medium', labels: ['devops'], dueDate: todayISO(5), description: 'GitHub Actions: lint, test, build; auto-deploy main to Vercel.' }),
    t('t3', { title: 'Fix login redirect loop', priority: 'urgent', labels: ['bug', 'backend'], dueDate: todayISO(-1), description: 'Users with expired refresh tokens get stuck between /login and /dashboard.' }),
    t('t4', { title: 'Research analytics providers', priority: 'low', labels: ['research'], description: 'Compare Plausible, PostHog and Vercel Analytics on price, privacy and features.' }),
    t('t5', { title: 'Build pricing table component', priority: 'medium', labels: ['frontend'], dueDate: todayISO(1), checklist: [{ id: 'c4', text: 'Monthly / yearly toggle', done: true }, { id: 'c5', text: 'Responsive layout', done: false }] }),
    t('t6', { title: 'REST API for user settings', priority: 'high', labels: ['backend'], dueDate: todayISO(3) }),
    t('t7', { title: 'Write onboarding emails', priority: 'low', labels: ['research'], dueDate: todayISO(8) }),
    t('t8', { title: 'Accessibility audit', priority: 'medium', labels: ['frontend', 'design'], description: 'Run axe + manual keyboard pass on all key flows.' }),
    t('t9', { title: 'Database indexing', priority: 'high', labels: ['backend', 'devops'], checklist: [{ id: 'c6', text: 'Profile slow queries', done: true }, { id: 'c7', text: 'Add composite indexes', done: true }] }),
    t('t10', { title: 'Launch announcement blog post', priority: 'medium', labels: ['research'], dueDate: todayISO(10) }),
    t('j1', { title: 'Frontend Developer — Razorpay', priority: 'high', labels: ['frontend'], description: 'Referral from college senior. React + TypeScript role.', dueDate: todayISO(4) }),
    t('j2', { title: 'SDE-1 — Zomato', priority: 'urgent', labels: ['backend'], description: 'Online assessment scheduled. Revise DSA: graphs, DP.', dueDate: todayISO(1), checklist: [{ id: 'jc1', text: 'Graphs revision', done: true }, { id: 'jc2', text: 'DP top-20 problems', done: false }, { id: 'jc3', text: 'Mock test', done: false }] }),
    t('j3', { title: 'Full-stack Intern — Freshworks', priority: 'medium', labels: ['frontend', 'backend'] }),
    t('j4', { title: 'React Developer — Swiggy', priority: 'high', labels: ['frontend'], description: 'Round 2: machine coding — build an autocomplete.', dueDate: todayISO(2) }),
    t('j5', { title: 'Update resume & portfolio', priority: 'medium', labels: ['design'], checklist: [{ id: 'jc4', text: 'Add new projects', done: true }, { id: 'jc5', text: 'Quantify impact', done: true }] }),
  ].map((task) => [task.id, task]),
)

export const seedBoards: Board[] = [
  {
    id: 'b1',
    name: 'Product Launch',
    emoji: '🚀',
    columns: [
      { id: 'b1-backlog', title: 'Backlog', taskIds: ['t4', 't7', 't10'] },
      { id: 'b1-todo', title: 'To Do', taskIds: ['t3', 't6', 't2'] },
      { id: 'b1-progress', title: 'In Progress', taskIds: ['t1', 't5'] },
      { id: 'b1-review', title: 'In Review', taskIds: ['t8'] },
      { id: 'b1-done', title: 'Done', taskIds: ['t9'] },
    ],
  },
  {
    id: 'b2',
    name: 'Job Hunt 2026',
    emoji: '💼',
    columns: [
      { id: 'b2-wish', title: 'Wishlist', taskIds: ['j3'] },
      { id: 'b2-applied', title: 'Applied', taskIds: ['j1'] },
      { id: 'b2-interview', title: 'Interviewing', taskIds: ['j2', 'j4'] },
      { id: 'b2-done', title: 'Done', taskIds: ['j5'] },
    ],
  },
]
