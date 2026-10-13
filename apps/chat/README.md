# 💬 DevChat — Real-time chat rooms for developers

**Live demo:** [devchat-jeevan.vercel.app](https://devchat-jeevan.vercel.app)

Slack-style public chat rooms for developers, built on Supabase Postgres and Realtime. Pick a display name and avatar colour (no sign-up), then join #general, #frontend, #interview-prep and other rooms, or create your own. Messages arrive instantly, and you can see who is online and who is typing. Unread badges tell you where the conversation moved while you were away. All validation and abuse protection is enforced in the database with row level security, CHECK constraints and rate-limit triggers, so the public key in the browser can't be misused.

**Tech:** React 19 · TypeScript (strict) · Vite 8 · Tailwind CSS v4 · Supabase (Postgres, RLS, Realtime Postgres Changes, Presence, Broadcast) · Lucide icons

## Features

- **Rooms sidebar**: search, unread counters per room (synced from the server on load and updated live), and a create-room dialog with slug auto-generation and validation. On mobile the sidebar becomes a drawer.
- **Real-time messages** through Postgres Changes (`INSERT` filtered by `room_id`), with no polling.
- **Presence**: an "N online" pill with avatars and a popover listing who is in the room.
- **Typing indicators** over Broadcast, throttled to one event per 2 s and expiring automatically ("Asha and Ravi are typing…").
- **Optimistic sending**: messages appear immediately with a client-generated UUID and are reconciled with the server row. Failures show inline **Retry / Discard**, and the 5-per-10-seconds rate limit shows a clear notice.
- **Message list**: grouped by author (5-minute window) and by day ("Today", "Yesterday", …), with hover timestamps. It auto-scrolls only when you are already at the bottom; otherwise a **"N new messages"** pill appears.
- **Infinite history**: 50 messages per page using a `(created_at, id)` keyset cursor, loaded when you scroll to the top. Scroll position is preserved, and there is also a keyboard-accessible "Load older messages" button.
- **Safe rich text**: `inline code`, fenced code blocks and auto-linked URLs (`rel="noopener noreferrer"`). Rendering uses React text nodes only, never `dangerouslySetInnerHTML`.
- **Composer**: Enter sends, Shift+Enter adds a new line, IME composition is respected, a 1000-character counter is shown, the textarea auto-grows, and sending is disabled while a send is in flight.
- **Resilience**: a "Connecting… / Reconnecting… / Offline" badge, and after a reconnect any messages missed during the gap are fetched again. Loading skeletons, empty states, error states with retry, and a "room not found" page that offers to create the room.
- **Deep links** via the URL hash (`#interview-prep`), with no router needed.
- **Dark / light theme** that follows the system preference by default, is persisted, and is applied before first paint.
- **Accessibility**: native `<dialog>` modals, labelled controls, `role="log"` message list, visible focus rings, focus moved into the mobile drawer, and `prefers-reduced-motion` respected.
- **Local persistence** in versioned `localStorage` keys (`devchat:v1:*`) with safe parsing: anonymous client id, profile, theme, and last-seen timestamps per room.

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # type-check + production build
npm run lint      # oxlint
```

The app works out of the box against the public demo project. To use your own backend, see below.

### Environment variables

| Variable                 | Default                     | Description                                   |
| ------------------------ | --------------------------- | --------------------------------------------- |
| `VITE_SUPABASE_URL`      | the DevChat demo project    | Your project URL, `https://<ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | the demo's publishable key  | Your **publishable** (`sb_publishable_…`) or legacy anon key |

Copy `.env.example` to `.env.local` and fill in the values. Never put a `service_role` / secret key in a frontend app.

## Architecture

```
Browser ──REST (PostgREST)──► chat_rooms / chat_messages   (RLS: select + insert only)
   │                              │ BEFORE INSERT triggers: server timestamps, trimming, rate limits
   │                              ▼
   └──WebSocket (Realtime)◄── supabase_realtime publication (Postgres Changes)
        ├─ channel "lobby"        → new rooms + messages in every room (unread badges)
        └─ channel "room:<id>"    → room inserts · Presence (online list) · Broadcast (typing)
```

### Database (see [`supabase/migrations`](supabase/migrations))

| Table           | Columns |
| --------------- | ------- |
| `chat_rooms`    | `id uuid pk`, `slug text unique` (`^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])$`), `name` (2–40 chars), `description` (≤ 140), `created_by uuid`, `created_at` |
| `chat_messages` | `id uuid pk`, `room_id → chat_rooms on delete cascade`, `client_id uuid`, `username` (2–24), `color` (`^#[0-9a-fA-F]{6}$`), `content` (1–1000 chars after trim), `created_at` |

Indexes: `(room_id, created_at desc)` for the timeline and pagination, plus `(client_id, created_at desc)` and `(created_by, created_at desc)` for the rate-limit lookups.

- **RLS** is enabled on both tables. Policies for `anon` and `authenticated` allow `SELECT` and `INSERT` only (a room must carry `created_by`, and a message must target a visible room). There are **no UPDATE/DELETE policies**, so history is append-only.
- **Grants** are least-privilege: Supabase's default table privileges are revoked and replaced with exactly `SELECT, INSERT`.
- **Triggers** are `SECURITY INVOKER` with `search_path = ''`:
  - `chat_messages_before_insert` forces `created_at = now()` (clients can't backdate messages), trims input, and rejects a 6th message from the same `client_id` within 10 seconds.
  - `chat_rooms_before_insert` limits room creation to 3 per `client_id` per hour.
  - Both take a per-client advisory lock so parallel requests can't slip past the limit, and raise `SQLSTATE PT429`. PostgREST maps that to **HTTP 429**, which the UI turns into friendly feedback.
- **Realtime**: both tables are added to the `supabase_realtime` publication.

### Frontend

- `useLobby` loads rooms and keeps unread counts. It stores the newest server timestamp you saw in each room, then counts newer messages from other people with `HEAD … count=exact`, so clock skew between devices doesn't matter.
- `useRoomChat` owns one room. It runs a reducer for history, optimistic sends and pagination, and one Realtime channel for inserts, Presence and Broadcast. The `ChatRoom` component is keyed by room id, so switching rooms tears down the channel and starts fresh.
- Identity is an anonymous `crypto.randomUUID()` stored in `localStorage`, used as the Presence key and the rate-limit key.

## Use your own Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Run the three files in `supabase/migrations/` in order in the SQL editor, or use `supabase db push` with the Supabase CLI. They create the tables, constraints, triggers, RLS policies and grants, add the tables to Realtime, and seed six rooms.
3. Copy the project URL and publishable key from **Project Settings → API Keys** into `.env.local`.
4. `npm run dev`.

The tables are named `chat_rooms` / `chat_messages` in `public` so they work with the default Data API settings. To keep them in a dedicated schema instead, create the same objects in that schema, add it under **Data API → Exposed schemas**, and change `DB_SCHEMA` and the table names in `src/lib/config.ts`.

## Security notes

- The key shipped in the bundle is a **publishable (anon) key**. It's designed to be public, and every request it makes is constrained by RLS, grants, CHECK constraints and the triggers above.
- There is **no authentication, by design**: it's a demo meant to be opened instantly. Display names aren't verified, and a determined user could rotate their `client_id` to get around per-client rate limits. For production you would add Supabase Auth (anonymous sign-ins work well here), key policies and limits on `auth.uid()`, and add moderation.
- Presence and typing payloads come from other clients. They're validated and length-capped before rendering, and all user text is rendered as plain text.
- Public Realtime channels are used for Presence and Broadcast. Private channels with Realtime Authorization are the next step once auth exists.

## Structure

```
supabase/migrations/          # Exact SQL applied to the database (tables, triggers, RLS, realtime, seed)
src/
├── App.tsx                   # Layout, hash routing, drawer, dialogs
├── lib/
│   ├── config.ts             # Supabase URL/key (env-overridable), schema + table names, limits
│   ├── supabase.ts           # Typed client
│   ├── api.ts                # Queries: rooms, keyset-paginated messages, inserts, unread counts
│   ├── richText.ts           # Safe tokenizer for code, code blocks and links
│   ├── profile.ts            # Client id, profile validation, avatar colours
│   ├── validation.ts         # Room slug/name/description rules (mirror the SQL CHECKs)
│   ├── errors.ts             # PostgREST error → friendly message (PT429, 23505, …)
│   ├── format.ts             # Time and day labels
│   ├── storage.ts            # Versioned, exception-safe localStorage
│   └── types.ts              # Row types + Supabase Database type
├── hooks/
│   ├── useLobby.ts           # Rooms, live room inserts, unread counts
│   ├── useRoomChat.ts        # History, Realtime inserts, Presence, typing, optimistic send, catch-up
│   ├── useHashSlug.ts        # #room deep links
│   ├── useTheme.ts / useOnline.ts / useToday.ts
└── components/
    ├── Sidebar.tsx           # Search, room list, unread badges, profile footer
    ├── ChatRoom.tsx          # Room shell + loading / error states
    ├── ChatHeader.tsx        # Title, connection badge, online popover
    ├── MessageList.tsx       # Grouping, day dividers, scroll management, new-messages pill
    ├── MessageText.tsx       # Renders rich-text tokens
    ├── Composer.tsx          # Auto-growing input with shortcuts and counter
    ├── TypingIndicator.tsx
    ├── CreateRoomDialog.tsx / ProfileDialog.tsx / Dialog.tsx
    └── Avatar.tsx / Logo.tsx / ui.ts
```
