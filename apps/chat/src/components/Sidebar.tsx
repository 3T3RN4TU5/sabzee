import { useId, useState } from 'react'
import { AlertCircle, Hash, Moon, Pencil, Plus, RefreshCw, Search, Sun, X } from 'lucide-react'
import type { LoadStatus } from '../hooks/useLobby'
import type { Theme } from '../hooks/useTheme'
import type { Profile, Room } from '../lib/types'
import { Avatar } from './Avatar'
import { LogoMark } from './Logo'
import { iconButtonClass } from './ui'

interface SidebarProps {
  rooms: Room[]
  status: LoadStatus
  activeSlug: string
  unread: Record<string, number>
  profile: Profile | null
  theme: Theme
  onRetry: () => void
  onSelect: (slug: string) => void
  onCreateRoom: () => void
  onEditProfile: () => void
  onToggleTheme: () => void
  /** Only rendered in the mobile drawer. */
  onClose?: () => void
}

export function Sidebar({
  rooms,
  status,
  activeSlug,
  unread,
  profile,
  theme,
  onRetry,
  onSelect,
  onCreateRoom,
  onEditProfile,
  onToggleTheme,
  onClose,
}: SidebarProps) {
  const [query, setQuery] = useState('')
  const searchId = useId()
  const q = query.trim().toLowerCase()
  const filtered = q
    ? rooms.filter((r) => r.name.toLowerCase().includes(q) || r.slug.includes(q) || r.description.toLowerCase().includes(q))
    : rooms

  return (
    <div className="flex h-full flex-col bg-slate-100 dark:bg-ink-900">
      <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3">
        <a href="#general" className="flex items-center gap-2.5 rounded-lg focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none">
          <LogoMark />
          <span>
            <span className="block text-base leading-none font-extrabold tracking-tight text-slate-900 dark:text-white">DevChat</span>
            <span className="mt-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">Real-time rooms for devs</span>
          </span>
        </a>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onToggleTheme}
            className={iconButtonClass}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
          >
            {theme === 'dark' ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </button>
          {onClose && (
            <button type="button" onClick={onClose} className={iconButtonClass} aria-label="Close room list">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="px-3 pb-2">
        <label htmlFor={searchId} className="sr-only">
          Search rooms
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            id={searchId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search rooms"
            className="w-full rounded-lg border border-transparent bg-white py-2 pr-3 pl-9 text-base shadow-sm sm:text-sm outline-none placeholder:text-slate-400 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:bg-ink-850 dark:placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
        <h2 className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase dark:text-slate-400">Rooms</h2>
        <button
          type="button"
          onClick={onCreateRoom}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-semibold text-violet-600 transition hover:bg-violet-500/10 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none dark:text-violet-400"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" /> New room
        </button>
      </div>

      <nav aria-label="Rooms" className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {status === 'loading' && (
          <ul className="space-y-1 px-1 pt-1" aria-busy="true" aria-label="Loading rooms">
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i} className="flex items-center gap-2.5 px-2 py-2">
                <span className="h-4 w-4 animate-pulse rounded bg-slate-300/70 dark:bg-ink-700" />
                <span className="h-3.5 animate-pulse rounded bg-slate-300/70 dark:bg-ink-700" style={{ width: `${45 + ((i * 17) % 40)}%` }} />
              </li>
            ))}
          </ul>
        )}

        {status === 'error' && (
          <div className="m-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold text-rose-600 dark:text-rose-300">
              <AlertCircle className="h-4 w-4" aria-hidden="true" /> Couldn&apos;t load rooms
            </p>
            <p className="mt-1 text-slate-600 dark:text-slate-400">Check your connection and try again.</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold shadow-sm hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none dark:bg-ink-800 dark:hover:bg-ink-700"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Retry
            </button>
          </div>
        )}

        {status === 'ready' && filtered.length === 0 && (
          <div className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            {q ? (
              <>
                No rooms match “{query.trim()}”.
                <button type="button" onClick={onCreateRoom} className="mt-2 block w-full font-semibold text-violet-600 hover:underline dark:text-violet-400">
                  Create one?
                </button>
              </>
            ) : (
              'No rooms yet — create the first one.'
            )}
          </div>
        )}

        {status === 'ready' && filtered.length > 0 && (
          <ul className="space-y-0.5">
            {filtered.map((room) => {
              const active = room.slug === activeSlug
              const count = active ? 0 : (unread[room.id] ?? 0)
              return (
                <li key={room.id}>
                  <a
                    href={`#${room.slug}`}
                    onClick={() => onSelect(room.slug)}
                    aria-current={active ? 'page' : undefined}
                    title={room.description || room.name}
                    className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-100 focus-visible:outline-none dark:focus-visible:ring-offset-ink-900 ${
                      active
                        ? 'bg-violet-600 text-white shadow-sm shadow-violet-600/25'
                        : count > 0
                          ? 'font-semibold text-slate-900 hover:bg-slate-200/70 dark:text-white dark:hover:bg-ink-800'
                          : 'text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-ink-800 dark:hover:text-slate-100'
                    }`}
                  >
                    <Hash className={`h-4 w-4 shrink-0 ${active ? 'text-violet-200' : 'text-slate-400 dark:text-slate-500'}`} aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate">{room.name}</span>
                    {count > 0 && (
                      <span className="rounded-full bg-violet-600 px-1.5 py-0.5 text-[10px] leading-none font-bold text-white tabular-nums dark:bg-violet-500">
                        {count > 99 ? '99+' : count}
                        <span className="sr-only"> unread</span>
                      </span>
                    )}
                  </a>
                </li>
              )
            })}
          </ul>
        )}
      </nav>

      <div className="border-t border-slate-200 p-3 dark:border-ink-800">
        {profile ? (
          <button
            type="button"
            onClick={onEditProfile}
            className="group flex w-full items-center gap-3 rounded-xl p-2 text-left transition hover:bg-slate-200/70 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none dark:hover:bg-ink-800"
          >
            <span className="relative">
              <Avatar name={profile.name} color={profile.color} />
              <span className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-slate-100 bg-emerald-500 dark:border-ink-900" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-slate-900 dark:text-white">{profile.name}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">Online · edit profile</span>
            </span>
            <Pencil className="h-4 w-4 text-slate-400 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
          </button>
        ) : (
          <p className="px-2 py-1 text-xs text-slate-500">Set up your profile to start chatting.</p>
        )}
      </div>
    </div>
  )
}
