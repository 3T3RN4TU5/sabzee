/** Sortable list primitives on top of dnd-kit: <SortableList>, <SortableItem> and <DragHandle>. OWNER: shell agent. */
import { closestCenter, DndContext, type UniqueIdentifier } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { cn } from '../../ui'
import { dropIndexes, makeAnnouncements, screenReaderInstructions, useSortSensors, verticalOnly } from './dnd.ts'

export interface SortableListProps {
  ids: UniqueIdentifier[]
  /** Readable name of an item for screen-reader announcements. */
  label: (id: UniqueIdentifier) => string
  noun?: string
  onMove: (from: number, to: number) => void
  children: ReactNode
}

export function SortableList({ ids, label, noun, onMove, children }: SortableListProps) {
  const sensors = useSortSensors()
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[verticalOnly]}
      accessibility={{ announcements: makeAnnouncements(ids, label, noun), screenReaderInstructions }}
      onDragEnd={(e) => {
        const m = dropIndexes(e, ids)
        if (m) onMove(m.from, m.to)
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  )
}

export interface DragHandleProps {
  /** Callback for the activator element. */
  attach: (el: HTMLElement | null) => void
  props: ButtonHTMLAttributes<HTMLButtonElement>
}

export interface SortableItemProps {
  id: UniqueIdentifier
  className?: string
  /** Element to render (default div; use 'li' inside a list). */
  as?: 'div' | 'li'
  /** Render the item; pass `handle` to <DragHandle>. */
  children: (handle: DragHandleProps, state: { dragging: boolean }) => ReactNode
}

export function SortableItem({ id, className, as: Tag = 'div', children }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style: CSSProperties = { transform: CSS.Translate.toString(transform), transition, position: 'relative', zIndex: isDragging ? 20 : undefined }
  return (
    <Tag ref={setNodeRef} style={style} className={cn(className, isDragging && 'rf-dragging')}>
      {children({ attach: setActivatorNodeRef, props: { ...attributes, ...listeners } as ButtonHTMLAttributes<HTMLButtonElement> }, { dragging: isDragging })}
    </Tag>
  )
}

/** The grip button (pointer + keyboard drag activator). */
export function DragHandle({ handle: { attach, props }, label, size = 'sm', className }: { handle: DragHandleProps; label: string; size?: 'xs' | 'sm'; className?: string }) {
  return (
    <button
      type="button"
      ref={attach}
      {...props}
      aria-label={label}
      title="Drag to reorder (or focus and press Space)"
      className={cn(
        'grid shrink-0 cursor-grab touch-none place-items-center rounded-md text-slate-300 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:text-indigo-600 focus-visible:outline-2 focus-visible:outline-indigo-500 active:cursor-grabbing dark:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300',
        size === 'xs' ? 'h-7 w-5' : 'h-8 w-6',
        className,
      )}
    >
      <GripVertical className="size-4" aria-hidden />
    </button>
  )
}
