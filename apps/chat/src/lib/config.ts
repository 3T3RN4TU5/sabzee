/**
 * Public client configuration. The publishable key is designed to ship to browsers:
 * every table is protected by row level security, append-only grants and rate-limit triggers
 * (see supabase/migrations). Override both values with VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
 */
const DEFAULT_SUPABASE_URL = 'https://sgggaogbkbjipolhpaug.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_snJp3tgKnJdilbb7qqK5HA_51-RHO8I'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim() || DEFAULT_SUPABASE_URL
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || DEFAULT_SUPABASE_ANON_KEY

/** Postgres schema + table names. Tables are prefixed so they can share a project's public schema. */
export const DB_SCHEMA = 'public'
export const ROOMS_TABLE = 'chat_rooms'
export const MESSAGES_TABLE = 'chat_messages'

export const DEFAULT_ROOM_SLUG = 'general'
export const PAGE_SIZE = 50
export const MESSAGE_MAX_LENGTH = 1000
