import { useCallback, useEffect, useRef, useState } from 'react'
import { countUnread, fetchRooms } from '../lib/api'
import { DB_SCHEMA, MESSAGES_TABLE, ROOMS_TABLE } from '../lib/config'
import { isRecord, readStored, writeStored } from '../lib/storage'
import { supabase } from '../lib/supabase'
import type { MessageRow, Room } from '../lib/types'

export type LoadStatus = 'loading' | 'ready' | 'error'

type LastSeen = Record<string, string>

const byName = (a: Room, b: Room) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })

function parseLastSeen(value: unknown): LastSeen | null {
  if (!isRecord(value)) return null
  const out: LastSeen = {}
  for (const [roomId, ts] of Object.entries(value)) {
    if (typeof ts === 'string' && !Number.isNaN(Date.parse(ts))) out[roomId] = ts
  }
  return out
}

/**
 * Room list + unread counters. One "lobby" Realtime channel listens for new rooms and for
 * messages in every room, so badges update live; on load (and after a reconnect) counts are
 * re-synced from the server using the last message timestamp the user saw in each room.
 */
export function useLobby(clientId: string, activeSlug: string) {
  const [rooms, setRooms] = useState<Room[]>([])
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [unread, setUnread] = useState<Record<string, number>>({})
  const lastSeen = useRef<LastSeen>(readStored('last-seen', parseLastSeen) ?? {})

  const activeRoom = rooms.find((r) => r.slug === activeSlug) ?? null
  const activeRoomId = activeRoom?.id ?? null
  const activeRef = useRef(activeRoomId)
  const activeSlugRef = useRef(activeSlug)

  // Entering a room clears its badge (React's "adjust state when a prop changes" pattern).
  const [badgeClearedFor, setBadgeClearedFor] = useState(activeRoomId)
  if (activeRoomId !== badgeClearedFor) {
    setBadgeClearedFor(activeRoomId)
    if (activeRoomId && unread[activeRoomId]) setUnread({ ...unread, [activeRoomId]: 0 })
  }

  useEffect(() => {
    activeRef.current = activeRoomId
    activeSlugRef.current = activeSlug
  }, [activeRoomId, activeSlug])

  const syncUnread = useCallback(
    async (list: Room[]) => {
      const targets = list.filter((r) => lastSeen.current[r.id] && r.slug !== activeSlugRef.current)
      const results = await Promise.allSettled(targets.map((r) => countUnread(r.id, lastSeen.current[r.id], clientId)))
      setUnread((prev) => {
        const next = { ...prev }
        results.forEach((res, i) => {
          if (res.status === 'fulfilled') next[targets[i].id] = res.value
        })
        return next
      })
    },
    [clientId],
  )

  const applyRooms = useCallback(
    (list: Room[]) => {
      setRooms(list.toSorted(byName))
      setStatus('ready')
      void syncUnread(list)
    },
    [syncUnread],
  )

  const load = useCallback(
    () =>
      fetchRooms().then(applyRooms, () => {
        setStatus('error')
      }),
    [applyRooms],
  )

  useEffect(() => {
    let cancelled = false
    fetchRooms().then(
      (list) => !cancelled && applyRooms(list),
      () => !cancelled && setStatus('error'),
    )
    return () => {
      cancelled = true
    }
  }, [applyRooms])

  const retry = useCallback(() => {
    setStatus('loading')
    void load()
  }, [load])

  useEffect(() => {
    let hasBeenLive = false
    const channel = supabase
      .channel('lobby')
      .on('postgres_changes', { event: 'INSERT', schema: DB_SCHEMA, table: ROOMS_TABLE }, (payload) => {
        const room = payload.new as Room
        setRooms((prev) => (prev.some((r) => r.id === room.id) ? prev : [...prev, room].sort(byName)))
      })
      .on('postgres_changes', { event: 'INSERT', schema: DB_SCHEMA, table: MESSAGES_TABLE }, (payload) => {
        const message = payload.new as MessageRow
        if (message.room_id === activeRef.current || message.client_id === clientId) return
        setUnread((prev) => ({ ...prev, [message.room_id]: (prev[message.room_id] ?? 0) + 1 }))
      })
      .subscribe((state) => {
        if (state !== 'SUBSCRIBED') return
        // After a dropped connection, re-fetch to pick up rooms and messages we missed.
        if (hasBeenLive) void load()
        hasBeenLive = true
      })
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [clientId, load])

  /** Remember the newest message the user has seen in a room (server timestamp). */
  const markSeen = useCallback((roomId: string, timestamp: string) => {
    const prev = lastSeen.current[roomId]
    if (prev && Date.parse(prev) >= Date.parse(timestamp)) return
    lastSeen.current = { ...lastSeen.current, [roomId]: timestamp }
    writeStored('last-seen', lastSeen.current)
  }, [])

  const addRoom = useCallback((room: Room) => {
    setRooms((prev) => (prev.some((r) => r.id === room.id) ? prev : [...prev, room].sort(byName)))
  }, [])

  return { rooms, activeRoom, status, unread, retry, markSeen, addRoom }
}
