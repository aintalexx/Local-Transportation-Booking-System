create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  sender_role text not null check (sender_role in ('passenger', 'driver')),
  sender_name text not null,
  sender_username text,
  message text not null check (char_length(trim(message)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_booking_created_idx
  on public.chat_messages (booking_id, created_at);

alter table public.chat_messages enable row level security;
alter table public.chat_messages replica identity full;

grant select, insert on public.chat_messages to anon, authenticated;

drop policy if exists "chat_messages_select_ride_participants" on public.chat_messages;
create policy "chat_messages_select_ride_participants"
  on public.chat_messages
  for select
  using (
    exists (
      select 1 from public.bookings
      where bookings.id = chat_messages.booking_id
        and (
          bookings.passenger_id = auth.uid()
          or bookings.driver_id = auth.uid()
        )
    )
  );

drop policy if exists "chat_messages_insert_ride_participants" on public.chat_messages;
create policy "chat_messages_insert_ride_participants"
  on public.chat_messages
  for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.bookings
      where bookings.id = chat_messages.booking_id
        and bookings.status in ('accepted', 'en_route', 'arrived', 'in_progress')
        and (
          (chat_messages.sender_role = 'passenger' and bookings.passenger_id = auth.uid())
          or (chat_messages.sender_role = 'driver' and bookings.driver_id = auth.uid())
        )
    )
  );

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
exception
  when duplicate_object then null;
end $$;
