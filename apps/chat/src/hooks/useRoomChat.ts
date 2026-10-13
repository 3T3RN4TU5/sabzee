import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { fetchMessagePage, fetchMessagesAfter, insertMessage, type MessagePage } from '../lib/api'
import { DB_SCHEMA, MESSAGES_TABLE } from '../lib/config'
import { describeError } from '../lib/errors'
import { timestampMs } from '../lib/format'
import { randomUUID, sanitizeIdentity } from '../lib/profile'
import { isRecord } from '../lib/storage'
import { supabase } from '../lib/supabase'
import type { ChatMessage, MessageRow, OnlineUser, Profile, Room } from '../lib/types'

export type ConnectionState = 'connecting' | 'live' | 'reconnecting'

export interface Typist {
  clientId: string
  name: string
  color: string
  until: number
}

interface State {
  status: 'loading' | 'ready' | 'error'
  /** Increments on "try again" to re-run the initial fetch. */
  attempt: number
  messages: ChatMessage[]
  hasMore: boolean
  loadingOlder: boolean
  olderFailed: boolean
}

type Action =
  | { type: 'loaded'; page: MessagePage }
  | { type: 'load-failed' }
  | { type: 'reload' }
  | { type: 'older-start' }
  | { type: 'older-loaded'; page: MessagePage }
  | { type: 'older-failed' }
  | { type: 'upsert'; rows: MessageRow[] }
  | { type: 'pending'; message: ChatMessage }
  | { type: 'failed'; id: string; error: string }
  | { type: 'discard'; id: string }

const TYPING_TTL_MS = 4000
const TYPING_THROTTLE_MS = 2000

const bySentTime = (a: ChatMessage, b: ChatMessage) =>
  timestampMs(a.created_at) - timestampMs(b.created_at) || a.id.localeCompare(b.id)

/** Server-confirmed messages in chronological order, then anything still sending / failed at the bottom. */
function merge(current: ChatMessage[], rows: MessageRow[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>(current.map((m) => [m.id, m]))
  for (const row of rows) byId.set(row.id, { ...row, status: 'sent' })
  const sent: ChatMessage[] = []
  const unsent: ChatMessage[] = []
  for (const m of byId.values()) (m.status === 'sent' ? sent : unsent).push(m)
  return [...sent.sort(bySentTime), ...unsent]
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'loaded':
      return { ...state, status: 'ready', messages: merge(state.messages, action.page.messages), hasMore: action.page.hasMore }
    case 'load-failed':
      return { ...state, status: 'error' }
    case 'reload':
      return { ...state, status: 'loading', attempt: state.attempt + 1 }
    case 'older-start':
      return { ...state, loadingOlder: true, olderFailed: false }
    case 'older-loaded':
      return { ...state, loadingOlder: false, messages: merge(state.messages, action.page.messages), hasMore: action.page.hasMore }
    case 'older-failed':
      return { ...state, loadingOlder: false, olderFailed: true }
    case 'upsert':
      return { ...state, messages: merge(state.messages, action.rows) }
    case 'pending': {
      const others = state.messages.filter((m) => m.id !== action.message.id)
      return { ...state, messages: [...others, action.message] }
    }
    case 'failed':
      return {
        ...state,
        messages: state.messages.map((m) => (m.id === action.id && m.status !== 'sent' ? { ...m, status: 'failed', error: action.error } : m)),
      }
    case 'discard':
      return { ...state, messages: state.messages.filter((m) => m.id !== action.id) }
  }
}

const initialState: State = { status: 'loading', attempt: 0, messages: [], hasMore: false, loadingOlder: false, olderFailed: false }

function toOnlineUsers(state: Record<string, unknown[]>): OnlineUser[] {
  const users: OnlineUser[] = []
  for (const [clientId, metas] of Object.entries(state)) {
    const meta = metas.at(-1)
    const identity = isRecord(meta) ? sanitizeIdentity(meta.name, meta.color) : null
    if (identity) users.push({ clientId, ...identity })
  }
  return users.sort((a, b) => a.name.localeCompare(b.name))
}

function parseTyping(payload: unknown): { clientId: string; name: string; color: string; typing: boolean } | null {
  if (!isRecord(payload)) return null
  const identity = sanitizeIdentity(payload.name, payload.color)
  if (!identity || typeof payload.clientId !== 'string' || typeof payload.typing !== 'boolean') return null
  return { clientId: payload.clientId, ...identity, typing: payload.typing }
}

/**
 * Everything for one open room: paginated history, Realtime inserts, Presence (who is online),
 * Broadcast typing indicators, optimistic sending and reconnect catch-up.
 * The owning component is keyed by room id, so all state starts fresh per room.
 */
export function useRoomChat(room: Room, clientId: string, profile: Profile) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [connection, setConnection] = useState<ConnectionState>('connecting')
  const [online, setOnline] = useState<OnlineUser[]>([])
  const [typists, setTypists] = useState<Typist[]>([])
  const [notice, setNotice] = useState<string | null>(null)

  const stateRef = useRef(state)
  const profileRef = useRef(profile)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const liveRef = useRef(false)
  const olderInFlight = useRef(false)
  const lastTypingSent = useRef(0)

  useEffect(() => {
    stateRef.current = state
    profileRef.current = profile
  })

  const catchUp = useCallback(async () => {
    const newest = stateRef.current.messages.findLast((m) => m.status === 'sent')
    try {
      const rows = newest ? await fetchMessagesAfter(room.id, newest.created_at) : (await fetchMessagePage(room.id)).messages
      if (rows.length) dispatch({ type: 'upsert', rows })
    } catch {
      // A later reconnect or the next Realtime event will fill the gap.
    }
  }, [room.id])

  // Initial page (and "try again").
  useEffect(() => {
    let cancelled = false
    fetchMessagePage(room.id).then(
      (page) => {
        if (cancelled) return
        dispatch({ type: 'loaded', page })
        // If Realtime went live while we were fetching, close any gap between the two.
        if (liveRef.current) void catchUp()
      },
      () => !cancelled && dispatch({ type: 'load-failed' }),
    )
    return () => {
      cancelled = true
    }
  }, [room.id, state.attempt, catchUp])

  // Realtime: inserts + presence + typing on one channel per room.
  useEffect(() => {
    let disposed = false
    let hasBeenLive = false
    const channel = supabase.channel(`room:${room.id}`, {
      config: { presence: { key: clientId }, broadcast: { self: false } },
    })
    channelRef.current = channel

    channel
      .on('postgres_changes', { event: 'INSERT', schema: DB_SCHEMA, table: MESSAGES_TABLE, filter: `room_id=eq.${room.id}` }, (payload) => {
        const row = payload.new as MessageRow
        dispatch({ type: 'upsert', rows: [row] })
        setTypists((prev) => (prev.some((t) => t.clientId === row.client_id) ? prev.filter((t) => t.clientId !== row.client_id) : prev))
      })
      .on('presence', { event: 'sync' }, () => {
        setOnline(toOnlineUsers(channel.presenceState()))
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const typing = parseTyping(payload)
        if (!typing || typing.clientId === clientId) return
        setTypists((prev) => {
          const rest = prev.filter((t) => t.clientId !== typing.clientId)
          return typing.typing ? [...rest, { clientId: typing.clientId, name: typing.name, color: typing.color, until: Date.now() + TYPING_TTL_MS }] : rest
        })
      })
      .subscribe((status) => {
        if (disposed) return
        if (status === 'SUBSCRIBED') {
          liveRef.current = true
          setConnection('live')
          void channel.track({ name: profileRef.current.name, color: profileRef.current.color })
          if (hasBeenLive && stateRef.current.status === 'ready') void catchUp()
          hasBeenLive = true
        } else {
          liveRef.current = false
          setConnection(hasBeenLive ? 'reconnecting' : 'connecting')
        }
      })

    return () => {
      disposed = true
      liveRef.current = false
      channelRef.current = null
      void supabase.removeChannel(channel)
    }
  }, [room.id, clientId, catchUp])

  // Re-announce presence when the user edits their name or colour.
  useEffect(() => {
    if (liveRef.current) void channelRef.current?.track({ name: profile.name, color: profile.color })
  }, [profile.name, profile.color])

  // Expire typing indicators of people who stopped without sending.
  useEffect(() => {
    if (typists.length === 0) return
    const timer = window.setInterval(() => {
      const now = Date.now()
      setTypists((prev) => (prev.some((t) => t.until <= now) ? prev.filter((t) => t.until > now) : prev))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [typists.length])

  const broadcastTyping = useCallback(
    (typing: boolean) => {
      const channel = channelRef.current
      if (!channel || !liveRef.current) return
      void channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: { clientId, name: profileRef.current.name, color: profileRef.current.color, typing },
      })
    },
    [clientId],
  )

  /** Call on every keystroke; sends at most one "typing" event per throttle window. */
  const notifyTyping = useCallback(() => {
    const now = Date.now()
    if (now - lastTypingSent.current < TYPING_THROTTLE_MS) return
    lastTypingSent.current = now
    broadcastTyping(true)
  }, [broadcastTyping])

  const stopTyping = useCallback(() => {
    if (lastTypingSent.current === 0) return
    lastTypingSent.current = 0
    broadcastTyping(false)
  }, [broadcastTyping])

  const deliver = useCallback(async (message: ChatMessage) => {
    try {
      const row = await insertMessage({
        id: message.id,
        room_id: message.room_id,
        client_id: message.client_id,
        username: message.username,
        color: message.color,
        content: message.content,
      })
      dispatch({ type: 'upsert', rows: [row] })
      setNotice(null)
    } catch (error) {
      // A retry of a message whose first attempt actually reached the server.
      if (isRecord(error) && error.code === '23505') {
        void catchUp()
        return
      }
      const friendly = describeError(error, 'Message not sent.')
      dispatch({ type: 'failed', id: message.id, error: friendly.message })
      if (friendly.rateLimited) setNotice(friendly.message)
    }
  }, [catchUp])

  const send = useCallback(
    async (raw: string) => {
      const content = raw.trim()
      if (!content) return
      const message: ChatMessage = {
        id: randomUUID(),
        room_id: room.id,
        client_id: clientId,
        username: profileRef.current.name,
        color: profileRef.current.color,
        content,
        created_at: new Date().toISOString(),
        status: 'sending',
      }
      dispatch({ type: 'pending', message })
      stopTyping()
      await deliver(message)
    },
    [room.id, clientId, deliver, stopTyping],
  )

  const retry = useCallback(
    (id: string) => {
      const message = stateRef.current.messages.find((m) => m.id === id)
      if (!message || message.status !== 'failed') return
      const again: ChatMessage = { ...message, status: 'sending', error: undefined }
      dispatch({ type: 'pending', message: again })
      void deliver(again)
    },
    [deliver],
  )

  const discard = useCallback((id: string) => dispatch({ type: 'discard', id }), [])
  const reload = useCallback(() => dispatch({ type: 'reload' }), [])
  const dismissNotice = useCallback(() => setNotice(null), [])

  const loadOlder = useCallback(async () => {
    const current = stateRef.current
    const oldest = current.messages.find((m) => m.status === 'sent')
    if (olderInFlight.current || !current.hasMore || current.status !== 'ready' || !oldest) return
    olderInFlight.current = true
    dispatch({ type: 'older-start' })
    try {
      const page = await fetchMessagePage(room.id, { created_at: oldest.created_at, id: oldest.id })
      dispatch({ type: 'older-loaded', page })
    } catch {
      dispatch({ type: 'older-failed' })
    } finally {
      olderInFlight.current = false
    }
  }, [room.id])

  return {
    ...state,
    connection,
    online,
    typists,
    notice,
    send,
    retry,
    discard,
    reload,
    loadOlder,
    notifyTyping,
    stopTyping,
    dismissNotice,
  }
}
