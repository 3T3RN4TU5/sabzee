-- DevChat: rooms + messages tables, validation constraints and rate-limit triggers.
-- Objects are prefixed with chat_ and live in the public schema (exposed by the Data API).

create table public.chat_rooms (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique
              constraint chat_rooms_slug_format check (slug ~ '^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])$'),
  name        text not null
              constraint chat_rooms_name_length check (char_length(btrim(name)) between 2 and 40),
  description text not null default ''
              constraint chat_rooms_description_length check (char_length(description) <= 140),
  created_by  uuid,
  created_at  timestamptz not null default now()
);

comment on table public.chat_rooms is 'DevChat rooms. Public read, anonymous insert (rate limited by created_by).';

create table public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.chat_rooms (id) on delete cascade,
  client_id  uuid not null,
  username   text not null
             constraint chat_messages_username_length check (char_length(btrim(username)) between 2 and 24),
  color      text not null
             constraint chat_messages_color_format check (color ~ '^#[0-9a-fA-F]{6}$'),
  content    text not null
             constraint chat_messages_content_length check (char_length(btrim(content, E' \t\r\n')) between 1 and 1000),
  created_at timestamptz not null default now()
);

comment on table public.chat_messages is 'DevChat messages. Public read, anonymous insert (5 messages / 10 s per client_id).';

-- Room timeline + pagination (newest first).
create index chat_messages_room_created_idx on public.chat_messages (room_id, created_at desc);
-- Rate-limit lookups.
create index chat_messages_client_created_idx on public.chat_messages (client_id, created_at desc);
create index chat_rooms_created_by_idx on public.chat_rooms (created_by, created_at desc);

-- BEFORE INSERT on messages: server-side timestamp, normalisation and rate limit.
create function public.chat_messages_before_insert()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  recent_count integer;
begin
  new.created_at := pg_catalog.now();
  new.username := pg_catalog.btrim(new.username);
  new.content := pg_catalog.btrim(new.content, E' \t\r\n');

  -- Serialise concurrent inserts from the same client so parallel requests cannot bypass the limit.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('chat_messages:' || new.client_id::text, 0));

  select pg_catalog.count(*) into recent_count
  from public.chat_messages m
  where m.client_id = new.client_id
    and m.created_at > pg_catalog.now() - interval '10 seconds';

  if recent_count >= 5 then
    raise exception 'Slow down! You can send up to 5 messages every 10 seconds.'
      using errcode = 'PT429', hint = 'Wait a few seconds and try again.';
  end if;

  return new;
end;
$$;

create trigger chat_messages_before_insert
before insert on public.chat_messages
for each row execute function public.chat_messages_before_insert();

-- BEFORE INSERT on rooms: server-side timestamp, normalisation and rate limit.
create function public.chat_rooms_before_insert()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  recent_count integer;
begin
  new.created_at := pg_catalog.now();
  new.name := pg_catalog.btrim(new.name);
  new.description := pg_catalog.btrim(coalesce(new.description, ''));

  if new.created_by is not null then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('chat_rooms:' || new.created_by::text, 0));

    select pg_catalog.count(*) into recent_count
    from public.chat_rooms r
    where r.created_by = new.created_by
      and r.created_at > pg_catalog.now() - interval '1 hour';

    if recent_count >= 3 then
      raise exception 'Room limit reached: you can create up to 3 rooms per hour.'
        using errcode = 'PT429', hint = 'Try again later or join an existing room.';
    end if;
  end if;

  return new;
end;
$$;

create trigger chat_rooms_before_insert
before insert on public.chat_rooms
for each row execute function public.chat_rooms_before_insert();

-- Trigger functions are never called directly by API roles.
revoke all on function public.chat_messages_before_insert() from public, anon, authenticated;
revoke all on function public.chat_rooms_before_insert() from public, anon, authenticated;
