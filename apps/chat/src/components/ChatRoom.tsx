import { useEffect } from 'react'
import { AlertCircle, X } from 'lucide-react'
import { useOnline } from '../hooks/useOnline'
import { useRoomChat } from '../hooks/useRoomChat'
import type { Profile, Room } from '../lib/types'
import { ChatHeader } from './ChatHeader'
import { Composer } from './Composer'
import { MessageList } from './MessageList'
import { TypingIndicator } from './TypingIndicator'

interface ChatRoomProps {
  room: Room
  clientId: string
  profile: Profile
  onOpenMenu: () => void
  onSeen: (roomId: string, timestamp: string) => void
}

/** One open room. Rendered with key={room.id} so switching rooms tears down channels and state. */
export function ChatRoom({ room, clientId, profile, onOpenMenu, onSeen }: ChatRoomProps) {
  const chat = useRoomChat(room, clientId, profile)
  const browserOnline = useOnline()

  // Record the newest message seen here; drives unread badges after the user leaves.
  useEffect(() => {
    if (chat.status !== 'ready') return
    const newest = chat.messages.findLast((m) => m.status === 'sent')
    onSeen(room.id, newest?.created_at ?? room.created_at)
  }, [chat.status, chat.messages, room.id, room.created_at, onSeen])

  return (
    <section className="flex h-full min-w-0 flex-1 flex-col" aria-label={`#${room.slug}`}>
      <ChatHeader room={room} online={chat.online} clientId={clientId} connection={chat.connection} browserOnline={browserOnline} onOpenMenu={onOpenMenu} />

      {chat.status === 'loading' && <MessagesSkeleton />}

      {chat.status === 'error' && (
        <div className="grid flex-1 place-items-center p-6">
          <div className="max-w-sm text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-rose-500/10 text-rose-500">
              <AlertCircle className="h-6 w-6" aria-hidden="true" />
            </span>
            <h2 className="mt-4 font-bold text-slate-900 dark:text-white">Couldn&apos;t load messages</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">The server didn&apos;t respond. Check your connection and try again.</p>
            <button
              type="button"
              onClick={chat.reload}
              className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 focus-visible:ring-4 focus-visible:ring-violet-500/30 focus-visible:outline-none"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {chat.status === 'ready' && (
        <MessageList
          room={room}
          clientId={clientId}
          messages={chat.messages}
          hasMore={chat.hasMore}
          loadingOlder={chat.loadingOlder}
          olderFailed={chat.olderFailed}
          onLoadOlder={chat.loadOlder}
          onRetry={chat.retry}
          onDiscard={chat.discard}
        />
      )}

      <TypingIndicator typists={chat.typists} />

      {chat.notice && (
        <div className="px-3 sm:px-5">
          <p
            role="alert"
            className="mx-auto mb-2 flex max-w-4xl items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-sm text-amber-800 dark:text-amber-200"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1">{chat.notice}</span>
            <button type="button" onClick={chat.dismissNotice} aria-label="Dismiss" className="rounded p-0.5 hover:bg-amber-500/20">
              <X className="h-4 w-4" />
            </button>
          </p>
        </div>
      )}

      <Composer roomSlug={room.slug} onSend={chat.send} onTyping={chat.notifyTyping} onStopTyping={chat.stopTyping} />
    </section>
  )
}

function MessagesSkeleton() {
  return (
    <div className="min-h-0 flex-1 overflow-hidden" aria-busy="true" aria-label="Loading messages">
      <div className="mx-auto flex h-full max-w-4xl flex-col justify-end gap-5 px-3 pb-4 sm:px-5">
        {[72, 48, 88, 60, 40].map((w, i) => (
          <div key={i} className="flex gap-3">
            <span className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-slate-200 dark:bg-ink-800" />
            <div className="flex-1 space-y-2 pt-1">
              <span className="block h-3 w-28 animate-pulse rounded bg-slate-200 dark:bg-ink-800" />
              <span className="block h-3 animate-pulse rounded bg-slate-200 dark:bg-ink-800" style={{ width: `${w}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
