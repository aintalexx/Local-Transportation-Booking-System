create table if not exists public.driver_locations (
  id uuid primary key default gen_random_uuid(),
  booking_id text not null unique,
  driver_username text not null,
  lat double precision not null check (lat >= -90 and lat <= 90),
  lng double precision not null check (lng >= -180 and lng <= 180),
  heading double precision,
  speed double precision,
  updated_at timestamptz not null default now()
);

create index if not exists driver_locations_booking_id_idx
  on public.driver_locations (booking_id);

alter table public.driver_locations enable row level security;
alter table public.driver_locations replica identity full;

grant select, insert, update on public.driver_locations to anon, authenticated;

drop policy if exists "driver_locations_select_demo" on public.driver_locations;
create policy "driver_locations_select_demo"
  on public.driver_locations
  for select
  using (true);

drop policy if exists "driver_locations_insert_demo" on public.driver_locations;
create policy "driver_locations_insert_demo"
  on public.driver_locations
  for insert
  with check (true);

drop policy if exists "driver_locations_update_demo" on public.driver_locations;
create policy "driver_locations_update_demo"
  on public.driver_locations
  for update
  using (true)
  with check (true);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.driver_locations;
  end if;
exception
  when duplicate_object then null;
end $$;
