import { useEffect, useId, useRef, useState } from 'react'
import { Hash, Menu, Users, WifiOff } from 'lucide-react'
import type { ConnectionState } from '../hooks/useRoomChat'
import type { OnlineUser, Room } from '../lib/types'
import { Avatar } from './Avatar'
import { iconButtonClass } from './ui'

interface ChatHeaderProps {
  room: Room
  online: OnlineUser[]
  clientId: string
  connection: ConnectionState
  browserOnline: boolean
  onOpenMenu: () => void
}

export function ChatHeader({ room, online, clientId, connection, browserOnline, onOpenMenu }: ChatHeaderProps) {
  return (
    <header className="flex items-center gap-2 border-b border-slate-200 bg-white/80 px-3 py-2.5 backdrop-blur sm:px-5 dark:border-ink-800 dark:bg-ink-950/80">
      <button type="button" onClick={onOpenMenu} className={`${iconButtonClass} md:hidden`} aria-label="Open room list">
        <Menu className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="flex items-center gap-1 text-base font-bold text-slate-900 dark:text-white">
          <Hash className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="truncate">{room.name}</span>
        </h1>
        {room.description && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{room.description}</p>}
      </div>
      <ConnectionBadge connection={connection} browserOnline={browserOnline} />
      <OnlineMenu online={online} clientId={clientId} />
    </header>
  )
}

function ConnectionBadge({ connection, browserOnline }: { connection: ConnectionState; browserOnline: boolean }) {
  if (!browserOnline)
    return (
      <span role="status" className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-300">
        <WifiOff className="h-3.5 w-3.5" aria-hidden="true" /> Offline
      </span>
    )
  if (connection === 'live') return null
  return (
    <span role="status" className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" aria-hidden="true" />
      {connection === 'connecting' ? 'Connecting…' : 'Reconnecting…'}
    </span>
  )
}

function OnlineMenu({ online, clientId }: { online: OnlineUser[]; clientId: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const preview = online.slice(0, 3)
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pr-3 pl-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none dark:border-ink-700 dark:bg-ink-900 dark:text-slate-200 dark:hover:bg-ink-800"
      >
        <span className="flex -space-x-1.5" aria-hidden="true">
          {preview.length > 0 ? (
            preview.map((u) => <Avatar key={u.clientId} name={u.name} color={u.color} size="xs" className="ring-2 ring-white dark:ring-ink-900" />)
          ) : (
            <span className="grid h-5 w-5 place-items-center rounded-full bg-slate-200 dark:bg-ink-700">
              <Users className="h-3 w-3" />
            </span>
          )}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
          {online.length} online
        </span>
      </button>
      {open && (
        <div
          id={panelId}
          className="absolute top-full right-0 z-20 mt-2 w-64 animate-pop-in overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-ink-700 dark:bg-ink-900"
        >
          <p className="border-b border-slate-100 px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:border-ink-800 dark:text-slate-400">
            Online in this room — {online.length}
          </p>
          {online.length === 0 ? (
            <p className="px-3 py-4 text-sm text-slate-500 dark:text-slate-400">Nobody here yet.</p>
          ) : (
            <ul className="max-h-72 overflow-y-auto py-1">
              {online.map((u) => (
                <li key={u.clientId} className="flex items-center gap-2.5 px-3 py-1.5 text-sm">
                  <span className="relative">
                    <Avatar name={u.name} color={u.color} size="sm" />
                    <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500 dark:border-ink-900" aria-hidden="true" />
                  </span>
                  <span className="truncate font-medium">{u.name}</span>
                  {u.clientId === clientId && <span className="text-xs text-slate-400">(you)</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
