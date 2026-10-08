export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface Task {
  id: string
  title: string
  description: string
  priority: Priority
  labels: string[]
  dueDate: string | null
  checklist: ChecklistItem[]
  createdAt: number
}

export interface Column {
  id: string
  title: string
  taskIds: string[]
}

export interface Board {
  id: string
  name: string
  emoji: string
  columns: Column[]
}

export interface Label {
  id: string
  name: string
  color: string
}
