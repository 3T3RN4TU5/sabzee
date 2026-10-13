import { createClient } from '@supabase/supabase-js'
import { DB_SCHEMA, SUPABASE_ANON_KEY, SUPABASE_URL } from './config'
import type { Database } from './types'

/** Single shared client. No auth: identity is an anonymous client id kept in localStorage. */
export const supabase = createClient<Database, typeof DB_SCHEMA>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  db: { schema: DB_SCHEMA },
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  realtime: { params: { eventsPerSecond: 10 } },
})
