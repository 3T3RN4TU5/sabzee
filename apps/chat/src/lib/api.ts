import { MESSAGES_TABLE, PAGE_SIZE, ROOMS_TABLE } from './config'
import { supabase } from './supabase'
import type { MessageRow, Room } from './types'
import type { RoomDraft } from './validation'

export interface MessagePage {
  /** Oldest → newest. */
  messages: MessageRow[]
  hasMore: boolean
}

export interface Cursor {
  created_at: string
  id: string
}

export async function fetchRooms(): Promise<Room[]> {
  const { data, error } = await supabase.from(ROOMS_TABLE).select('*').order('name')
  if (error) throw error
  return data
}

export async function createRoom(draft: RoomDraft, clientId: string): Promise<Room> {
  const { data, error } = await supabase
    .from(ROOMS_TABLE)
    .insert({ slug: draft.slug, name: draft.name.trim(), description: draft.description.trim(), created_by: clientId })
    .select()
    .single()
  if (error) throw error
  return data
}

/**
 * Newest page of a room, or the page before `before`. Uses a (created_at, id) keyset cursor so
 * messages sharing a timestamp are never skipped or duplicated. Fetches one extra row to know
 * whether older history exists.
 */
export async function fetchMessagePage(roomId: string, before?: Cursor): Promise<MessagePage> {
  let query = supabase.from(MESSAGES_TABLE).select('*').eq('room_id', roomId)
  if (before) {
    const ts = `"${before.created_at}"`
    query = query.or(`created_at.lt.${ts},and(created_at.eq.${ts},id.lt.${before.id})`)
  }
  const { data, error } = await query
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(PAGE_SIZE + 1)
  if (error) throw error
  const hasMore = data.length > PAGE_SIZE
  return { messages: data.slice(0, PAGE_SIZE).reverse(), hasMore }
}

/** Messages newer than `after` — used to fill the gap after a Realtime reconnect. */
export async function fetchMessagesAfter(roomId: string, after: string): Promise<MessageRow[]> {
  const { data, error } = await supabase
    .from(MESSAGES_TABLE)
    .select('*')
    .eq('room_id', roomId)
    .gt('created_at', after)
    .order('created_at', { ascending: true })
    .limit(200)
  if (error) throw error
  return data
}

export async function insertMessage(message: Omit<MessageRow, 'created_at'>): Promise<MessageRow> {
  const { data, error } = await supabase.from(MESSAGES_TABLE).insert(message).select().single()
  if (error) throw error
  return data
}

/** Messages from other people posted after `since` (server timestamps, so clock skew does not matter). */
export async function countUnread(roomId: string, since: string, clientId: string): Promise<number> {
  const { count, error } = await supabase
    .from(MESSAGES_TABLE)
    .select('id', { count: 'exact', head: true })
    .eq('room_id', roomId)
    .gt('created_at', since)
    .neq('client_id', clientId)
  if (error) throw error
  return count ?? 0
}
