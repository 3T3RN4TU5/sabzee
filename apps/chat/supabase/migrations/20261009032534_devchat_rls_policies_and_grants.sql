-- DevChat: row level security and least-privilege grants.
-- Anyone (anon or signed in) may read and insert. There are deliberately no UPDATE / DELETE policies
-- or grants, so history is append-only from the API.

alter table public.chat_rooms enable row level security;
alter table public.chat_messages enable row level security;

create policy "Rooms are readable by everyone"
  on public.chat_rooms for select
  to anon, authenticated
  using (true);

create policy "Anyone can create an attributed room"
  on public.chat_rooms for insert
  to anon, authenticated
  with check (created_by is not null);

create policy "Messages are readable by everyone"
  on public.chat_messages for select
  to anon, authenticated
  using (true);

create policy "Anyone can post to a visible room"
  on public.chat_messages for insert
  to anon, authenticated
  with check (exists (select 1 from public.chat_rooms r where r.id = chat_messages.room_id));

-- Replace Supabase's broad default table privileges with exactly SELECT + INSERT.
revoke all on table public.chat_rooms, public.chat_messages from anon, authenticated;
grant select, insert on table public.chat_rooms, public.chat_messages to anon, authenticated;
