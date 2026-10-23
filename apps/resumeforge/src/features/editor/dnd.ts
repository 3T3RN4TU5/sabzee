/** dnd-kit setup shared by the section, entry and bullet lists. OWNER: shell agent. */
import { KeyboardSensor, PointerSensor, useSensor, useSensors, type Announcements, type DragEndEvent, type Modifier, type ScreenReaderInstructions, type UniqueIdentifier } from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'

/** Pointer (with a small distance so clicks still work) + keyboard (Space to lift, arrows, Space to drop). */
export function useSortSensors() {
  return useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }))
}

/** Lists only move vertically. */
export const verticalOnly: Modifier = ({ transform }) => ({ ...transform, x: 0 })

export const screenReaderInstructions: ScreenReaderInstructions = {
  draggable: 'To reorder, press Space or Enter to pick the item up, use the up and down arrow keys to move it, then press Space or Enter again to drop it. Press Escape to cancel.',
}

/** Screen-reader announcements that name the item and its position ("Experience, position 2 of 6"). */
export function makeAnnouncements(ids: readonly UniqueIdentifier[], label: (id: UniqueIdentifier) => string, noun = 'item'): Announcements {
  const pos = (id: UniqueIdentifier) => ids.indexOf(id) + 1
  const n = ids.length
  return {
    onDragStart: ({ active }) => `Picked up ${noun} ${label(active.id)}, position ${pos(active.id)} of ${n}.`,
    onDragOver: ({ active, over }) => (over ? `${label(active.id)} is now at position ${pos(over.id)} of ${n}.` : `${label(active.id)} is no longer over the list.`),
    onDragEnd: ({ active, over }) => (over ? `Dropped ${label(active.id)} at position ${pos(over.id)} of ${n}.` : `Dropped ${label(active.id)}.`),
    onDragCancel: ({ active }) => `Reordering cancelled. ${label(active.id)} returned to position ${pos(active.id)} of ${n}.`,
  }
}

/** Resolve a drag end into (from, to) indexes, or null when nothing moved. */
export function dropIndexes(e: DragEndEvent, ids: readonly UniqueIdentifier[]): { from: number; to: number } | null {
  if (!e.over || e.active.id === e.over.id) return null
  const from = ids.indexOf(e.active.id)
  const to = ids.indexOf(e.over.id)
  return from < 0 || to < 0 ? null : { from, to }
}
