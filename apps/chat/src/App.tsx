import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CloudOff, Hash, Loader2, Menu, Plus, RefreshCw } from 'lucide-react'
import { ChatRoom } from './components/ChatRoom'
import { CreateRoomDialog } from './components/CreateRoomDialog'
import { LogoMark } from './components/Logo'
import { ProfileDialog } from './components/ProfileDialog'
import { Sidebar } from './components/Sidebar'
import { iconButtonClass, primaryButtonClass, secondaryButtonClass } from './components/ui'
import { useHashSlug } from './hooks/useHashSlug'
import { useLobby } from './hooks/useLobby'
import { useTheme } from './hooks/useTheme'
import { DEFAULT_ROOM_SLUG } from './lib/config'
import { getClientId, loadProfile, saveProfile } from './lib/profile'
import type { Profile, Room } from './lib/types'
import { SLUG_RE } from './lib/validation'

type DialogState = { kind: 'none' } | { kind: 'profile' } | { kind: 'create-room'; slug?: string }

export default function App() {
  const [clientId] = useState(getClientId)
  const [profile, setProfile] = useState<Profile | null>(loadProfile)
  const [dialog, setDialog] = useState<DialogState>({ kind: 'none' })
  const [drawerOpen, setDrawerOpen] = useState(false)
  const { theme, toggle: toggleTheme } = useTheme()
  const { slug, navigate } = useHashSlug()
  const lobby = useLobby(clientId, slug)
  const { addRoom } = lobby
  const drawerRef = useRef<HTMLElement>(null)
  const existingSlugs = useMemo(() => new Set(lobby.rooms.map((r) => r.slug)), [lobby.rooms])

  // No hash yet → land in #general without adding a history entry.
  useEffect(() => {
    if (!slug) navigate(DEFAULT_ROOM_SLUG, true)
  }, [slug, navigate])

  // The mobile drawer takes focus when it opens and closes on Escape.
  useEffect(() => {
    if (!drawerOpen) return
    drawerRef.current?.querySelector<HTMLElement>('input, a, button')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  const handleSaveProfile = useCallback((next: Profile) => {
    saveProfile(next)
    setProfile(next)
    setDialog({ kind: 'none' })
  }, [])

  const handleRoomCreated = useCallback(
    (room: Room) => {
      addRoom(room)
      setDialog({ kind: 'none' })
      navigate(room.slug)
    },
    [addRoom, navigate],
  )

  const openMenu = useCallback(() => setDrawerOpen(true), [])
  const room = lobby.activeRoom

  const sidebarProps = {
    rooms: lobby.rooms,
    status: lobby.status,
    activeSlug: slug,
    unread: lobby.unread,
    profile,
    theme,
    onRetry: lobby.retry,
    onSelect: () => setDrawerOpen(false),
    onCreateRoom: () => {
      setDrawerOpen(false)
      setDialog({ kind: 'create-room' })
    },
    onEditProfile: () => {
      setDrawerOpen(false)
      setDialog({ kind: 'profile' })
    },
    onToggleTheme: toggleTheme,
  }

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden w-72 shrink-0 border-r border-slate-200 md:block dark:border-ink-800">
        <Sidebar {...sidebarProps} />
      </aside>

      {/* Mobile drawer */}
      <div className={`fixed inset-0 z-40 md:hidden ${drawerOpen ? '' : 'pointer-events-none'}`} aria-hidden={!drawerOpen}>
        <div
          className={`absolute inset-0 bg-slate-950/50 backdrop-blur-[2px] transition-opacity duration-200 ${drawerOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setDrawerOpen(false)}
        />
        {/* Visibility flips instantly on open (so focus can move in) but waits for the slide-out on close. */}
        <aside
          ref={drawerRef}
          aria-label="Room list"
          className={`absolute inset-y-0 left-0 w-[85%] max-w-xs shadow-2xl duration-200 ease-out ${
            drawerOpen ? 'visible translate-x-0 transition-transform' : 'invisible -translate-x-full transition-[transform,visibility]'
          }`}
        >
          <Sidebar {...sidebarProps} onClose={() => setDrawerOpen(false)} />
        </aside>
      </div>

      <main className="flex min-w-0 flex-1 flex-col bg-white dark:bg-ink-950">
        {room && profile ? (
          <ChatRoom key={room.id} room={room} clientId={clientId} profile={profile} onOpenMenu={openMenu} onSeen={lobby.markSeen} />
        ) : (
          <Placeholder
            status={lobby.status}
            slug={slug}
            hasProfile={profile !== null}
            onOpenMenu={openMenu}
            onRetry={lobby.retry}
            onCreate={(s) => setDialog({ kind: 'create-room', slug: s })}
          />
        )}
      </main>

      <ProfileDialog
        open={profile === null || dialog.kind === 'profile'}
        profile={profile}
        onSave={handleSaveProfile}
        onClose={() => setDialog({ kind: 'none' })}
      />
      <CreateRoomDialog
        open={dialog.kind === 'create-room' && profile !== null}
        clientId={clientId}
        initialSlug={dialog.kind === 'create-room' ? dialog.slug : undefined}
        existingSlugs={existingSlugs}
        onClose={() => setDialog({ kind: 'none' })}
        onCreated={handleRoomCreated}
      />
    </div>
  )
}

interface PlaceholderProps {
  status: 'loading' | 'ready' | 'error'
  slug: string
  hasProfile: boolean
  onOpenMenu: () => void
  onRetry: () => void
  onCreate: (slug: string) => void
}

/** Main panel when no room is open: loading, onboarding backdrop, or an unknown #slug. */
function Placeholder({ status, slug, hasProfile, onOpenMenu, onRetry, onCreate }: PlaceholderProps) {
  const notFound = status === 'ready' && hasProfile && slug !== ''
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2.5 md:hidden dark:border-ink-800">
        <button type="button" onClick={onOpenMenu} className={iconButtonClass} aria-label="Open room list">
          <Menu className="h-5 w-5" />
        </button>
        <LogoMark className="h-7 w-7" />
        <span className="font-extrabold text-slate-900 dark:text-white">DevChat</span>
      </div>
      <div className="grid flex-1 place-items-center p-6 text-center">
        {notFound ? (
          <div className="max-w-sm">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-ink-850">
              <Hash className="h-7 w-7" aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">
              <span className="font-mono">#{slug}</span> doesn&apos;t exist
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">The room may have been mistyped. Pick one from the list or create it.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <a href={`#${DEFAULT_ROOM_SLUG}`} className={secondaryButtonClass}>
                Go to #{DEFAULT_ROOM_SLUG}
              </a>
              {SLUG_RE.test(slug) && (
                <button type="button" onClick={() => onCreate(slug)} className={primaryButtonClass}>
                  <Plus className="h-4 w-4" aria-hidden="true" /> Create #{slug}
                </button>
              )}
            </div>
          </div>
        ) : status === 'error' ? (
          <div className="max-w-sm">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-500/10 text-rose-500">
              <CloudOff className="h-7 w-7" aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-xl font-bold text-slate-900 dark:text-white">Can&apos;t reach the chat server</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Check your connection — DevChat will pick up right where you left off.</p>
            <button type="button" onClick={onRetry} className={`${primaryButtonClass} mt-5`}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-slate-400" role="status">
            <LogoMark className="h-12 w-12" />
            {status === 'loading' ? (
              <span className="inline-flex items-center gap-2 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading rooms…
              </span>
            ) : (
              <span className="text-sm">Set up your profile to join the conversation.</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
