export type Room = {
  id: string
  slug: string
  name: string
  description: string
  created_by: string | null
  created_at: string
}

export type MessageRow = {
  id: string
  room_id: string
  client_id: string
  username: string
  color: string
  content: string
  created_at: string
}

export type MessageStatus = 'sent' | 'sending' | 'failed'

export interface ChatMessage extends MessageRow {
  status: MessageStatus
  /** Human readable reason when status is "failed". */
  error?: string
}

export interface Profile {
  name: string
  color: string
}

export interface OnlineUser {
  clientId: string
  name: string
  color: string
}

/** Supabase type map for the two DevChat tables (hand-written to match the SQL migrations). */
export type Database = {
  public: {
    Tables: {
      chat_rooms: {
        Row: Room
        Insert: { id?: string; slug: string; name: string; description?: string; created_by: string; created_at?: string }
        Update: Record<string, never>
        Relationships: []
      }
      chat_messages: {
        Row: MessageRow
        Insert: { id?: string; room_id: string; client_id: string; username: string; color: string; content: string; created_at?: string }
        Update: Record<string, never>
        Relationships: [
          { foreignKeyName: 'chat_messages_room_id_fkey'; columns: ['room_id']; isOneToOne: false; referencedRelation: 'chat_rooms'; referencedColumns: ['id'] },
        ]
      }
    }
    Views: Record<never, never>
    Functions: Record<never, never>
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}
