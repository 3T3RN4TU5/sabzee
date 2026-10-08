import type { Priority, Task } from '../types'

export interface Filters {
  query: string
  priority: Priority | 'all'
  label: string | 'all'
}

export function matches(task: Task, f: Filters) {
  const q = f.query.trim().toLowerCase()
  return (
    (!q || task.title.toLowerCase().includes(q) || task.description.toLowerCase().includes(q)) &&
    (f.priority === 'all' || task.priority === f.priority) &&
    (f.label === 'all' || task.labels.includes(f.label))
  )
}
