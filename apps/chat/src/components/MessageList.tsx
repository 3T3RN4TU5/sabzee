import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, ArrowDown, Hash, Loader2, RefreshCw } from 'lucide-react'
import { useToday } from '../hooks/useToday'
import { dayKey, dayLabel, formatFull, formatTime, timestampMs } from '../lib/format'
import type { ChatMessage, Room } from '../lib/types'
import { Avatar } from './Avatar'
import { MessageText } from './MessageText'

interface MessageListProps {
  room: Room
  clientId: string
  messages: ChatMessage[]
  hasMore: boolean
  loadingOlder: boolean
  olderFailed: boolean
  onLoadOlder: () => void
  onRetry: (id: string) => void
  onDiscard: (id: string) => void
}

type Item =
  | { kind: 'day'; key: string; iso: string }
  | { kind: 'group'; key: string; messages: ChatMessage[] }

const GROUP_WINDOW_MS = 5 * 60 * 1000
const BOTTOM_THRESHOLD_PX = 80
const LOAD_OLDER_THRESHOLD_PX = 240

/** Day separators + runs of consecutive messages from the same author within five minutes. */
function buildItems(messages: ChatMessage[]): Item[] {
  const items: Item[] = []
  let day = ''
  let group: Extract<Item, { kind: 'group' }> | null = null
  for (const m of messages) {
    const key = dayKey(m.created_at)
    if (key !== day) {
      day = key
      items.push({ kind: 'day', key: `day-${key}`, iso: m.created_at })
      group = null
    }
    const prev = group?.messages.at(-1)
    if (group && prev && prev.client_id === m.client_id && timestampMs(m.created_at) - timestampMs(prev.created_at) < GROUP_WINDOW_MS) {
      group.messages.push(m)
    } else {
      group = { kind: 'group', key: m.id, messages: [m] }
      items.push(group)
    }
  }
  return items
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function MessageList({ room, clientId, messages, hasMore, loadingOlder, olderFailed, onLoadOlder, onRetry, onDiscard }: MessageListProps) {
  const today = useToday()
  const scrollRef = useRef<HTMLDivElement>(null)
  const atBottom = useRef(true)
  /** scrollHeight - scrollTop from the last scroll event; restoring it keeps the view steady when history is prepended. */
  const offsetFromBottom = useRef(0)
  const previous = useRef<{ first?: string; last?: string; count: number } | null>(null)
  /** Id of the newest message when the user scrolled away from the bottom (drives the "new messages" pill). */
  const [anchorId, setAnchorId] = useState<string | null>(null)

  const items = useMemo(() => buildItems(messages), [messages])

  const unseen = useMemo(() => {
    if (!anchorId) return 0
    const index = messages.findIndex((m) => m.id === anchorId)
    return messages.slice(index + 1).filter((m) => m.client_id !== clientId).length
  }, [anchorId, messages, clientId])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const first = messages[0]?.id
    const last = messages.at(-1)?.id
    const prev = previous.current
    previous.current = { first, last, count: messages.length }

    if (!prev || prev.count === 0) {
      el.scrollTop = el.scrollHeight
    } else if (first !== prev.first && last === prev.last) {
      el.scrollTop = el.scrollHeight - offsetFromBottom.current
    } else if (last !== prev.last && (atBottom.current || messages.at(-1)?.client_id === clientId)) {
      el.scrollTo({ top: el.scrollHeight, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
    }
    offsetFromBottom.current = el.scrollHeight - el.scrollTop
  }, [messages, clientId])

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    offsetFromBottom.current = el.scrollHeight - el.scrollTop
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD_PX
    if (nearBottom !== atBottom.current) {
      atBottom.current = nearBottom
      setAnchorId(nearBottom ? null : (messages.at(-1)?.id ?? null))
    }
    if (el.scrollTop < LOAD_OLDER_THRESHOLD_PX && hasMore && !loadingOlder && !olderFailed) onLoadOlder()
  }

  function scrollToBottom() {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto [overflow-anchor:none]"
        role="log"
        aria-label={`Messages in #${room.slug}`}
        aria-relevant="additions"
        tabIndex={0}
      >
        <div className="mx-auto flex min-h-full max-w-4xl flex-col justify-end px-3 pt-4 pb-2 sm:px-5">
          {hasMore ? (
            <div className="flex justify-center py-3">
              {olderFailed ? (
                <button type="button" onClick={onLoadOlder} className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-500/15 dark:text-rose-300">
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Couldn&apos;t load older messages — retry
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onLoadOlder}
                  disabled={loadingOlder}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-200/60 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:outline-none disabled:cursor-wait dark:text-slate-400 dark:hover:bg-ink-800"
                >
                  {loadingOlder ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : null}
                  {loadingOlder ? 'Loading older messages…' : 'Load older messages'}
                </button>
              )}
            </div>
          ) : (
            <RoomIntro room={room} empty={messages.length === 0} />
          )}

          <ol className="space-y-0.5">
            {items.map((item) =>
              item.kind === 'day' ? (
                <li key={item.key} className="relative my-4 flex items-center justify-center" role="separator" aria-label={dayLabel(item.iso, today)}>
                  <span className="absolute inset-x-0 top-1/2 h-px bg-slate-200 dark:bg-ink-800" aria-hidden="true" />
                  <span className="relative rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-[11px] font-semibold text-slate-500 dark:border-ink-800 dark:bg-ink-950 dark:text-slate-400">
                    {dayLabel(item.iso, today)}
                  </span>
                </li>
              ) : (
                <MessageGroup key={item.key} messages={item.messages} mine={item.messages[0].client_id === clientId} onRetry={onRetry} onDiscard={onDiscard} />
              ),
            )}
          </ol>
        </div>
      </div>

      {unseen > 0 && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 animate-pop-in items-center gap-1.5 rounded-full bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-600/30 transition hover:bg-violet-500 focus-visible:ring-4 focus-visible:ring-violet-500/40 focus-visible:outline-none"
        >
          <ArrowDown className="h-4 w-4" aria-hidden="true" />
          {unseen === 1 ? '1 new message' : `${unseen} new messages`}
        </button>
      )}
    </div>
  )
}

function RoomIntro({ room, empty }: { room: Room; empty: boolean }) {
  return (
    <div className="mb-2 px-1 pt-6 pb-4 sm:px-2">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-linear-to-br from-violet-500 to-cyan-500 text-white shadow-lg shadow-violet-500/20">
        <Hash className="h-7 w-7" aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Welcome to #{room.slug}</h2>
      <p className="mt-1 max-w-xl text-sm text-slate-500 dark:text-slate-400">
        {room.description || `This is the very beginning of #${room.slug}.`}
      </p>
      {empty && (
        <p className="mt-4 inline-block rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500 dark:border-ink-700 dark:text-slate-400">
          No messages yet — be the first to say hi. Wrap code in <code className="font-mono text-rose-600 dark:text-rose-300">`backticks`</code> and links are clickable.
        </p>
      )}
    </div>
  )
}

interface MessageGroupProps {
  messages: ChatMessage[]
  mine: boolean
  onRetry: (id: string) => void
  onDiscard: (id: string) => void
}

function MessageGroup({ messages, mine, onRetry, onDiscard }: MessageGroupProps) {
  const head = messages[0]
  return (
    <li className="group/msg -mx-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-slate-100/80 dark:hover:bg-ink-900/70">
      <div className="flex gap-3">
        <Avatar name={head.username} color={head.color} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-bold" style={{ color: head.color }}>
              {head.username}
            </span>
            {mine && <span className="rounded bg-slate-200 px-1 text-[10px] font-semibold text-slate-600 uppercase dark:bg-ink-800 dark:text-slate-400">you</span>}
            <time dateTime={head.created_at} title={formatFull(head.created_at)} className="text-xs text-slate-400 dark:text-slate-500">
              {formatTime(head.created_at)}
            </time>
          </p>
          <ul className="space-y-1">
            {messages.map((m, i) => (
              <li key={m.id} className={`group/line relative ${m.status === 'sending' ? 'opacity-60' : ''}`}>
                {i > 0 && (
                  <time
                    dateTime={m.created_at}
                    title={formatFull(m.created_at)}
                    className="absolute top-1 -left-12 hidden w-10 text-right text-[10px] text-slate-400 group-hover/line:block dark:text-slate-500"
                  >
                    {formatTime(m.created_at)}
                  </time>
                )}
                <MessageText content={m.content} />
                {m.status === 'sending' && (
                  <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-400">
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Sending…
                  </span>
                )}
                {m.status === 'failed' && (
                  <p role="alert" className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <span className="inline-flex items-center gap-1 font-medium text-rose-600 dark:text-rose-400">
                      <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" /> Not sent: {m.error}
                    </span>
                    <button type="button" onClick={() => onRetry(m.id)} className="font-semibold text-violet-600 hover:underline dark:text-violet-400">
                      Retry
                    </button>
                    <button type="button" onClick={() => onDiscard(m.id)} className="font-semibold text-slate-500 hover:underline dark:text-slate-400">
                      Discard
                    </button>
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </li>
  )
}
