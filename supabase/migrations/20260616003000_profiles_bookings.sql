create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text not null,
  phone text,
  role text not null check (role in ('passenger', 'driver', 'admin')),
  vehicle_type text,
  plate_number text,
  is_online boolean not null default false,
  approval_status text not null default 'approved' check (approval_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  passenger_id uuid not null references public.profiles(id) on delete cascade,
  driver_id uuid references public.profiles(id),
  passenger_name text not null,
  passenger_phone text,
  driver_name text,
  driver_phone text,
  driver_vehicle_type text,
  driver_plate_number text,
  pickup_lat double precision not null check (pickup_lat >= -90 and pickup_lat <= 90),
  pickup_lng double precision not null check (pickup_lng >= -180 and pickup_lng <= 180),
  pickup_address text not null,
  destination_lat double precision not null check (destination_lat >= -90 and destination_lat <= 90),
  destination_lng double precision not null check (destination_lng >= -180 and destination_lng <= 180),
  destination_address text not null,
  distance_km numeric not null check (distance_km > 0 and distance_km <= 500),
  base_price numeric not null check (base_price > 0),
  final_price numeric not null check (final_price > 0),
  payment_method text not null,
  vehicle_type text not null,
  ride_type text check (ride_type in ('solo', 'shared')),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'en_route', 'arrived', 'in_progress', 'completed', 'cancelled')),
  discount_type text,
  discount_amount numeric,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  completed_at timestamptz
);

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists bookings_passenger_id_idx on public.bookings (passenger_id);
create index if not exists bookings_driver_id_idx on public.bookings (driver_id);
create index if not exists bookings_pending_vehicle_idx on public.bookings (status, vehicle_type);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    username,
    full_name,
    phone,
    role,
    vehicle_type,
    plate_number,
    approval_status
  )
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'username', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1), 'New User'),
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(nullif(new.raw_user_meta_data ->> 'role', ''), 'passenger'),
    nullif(new.raw_user_meta_data ->> 'vehicle_type', ''),
    nullif(new.raw_user_meta_data ->> 'plate_number', ''),
    coalesce(
      nullif(new.raw_user_meta_data ->> 'approval_status', ''),
      case when (new.raw_user_meta_data ->> 'role') = 'driver' then 'pending' else 'approved' end
    )
  )
  on conflict (id) do update set
    username = excluded.username,
    full_name = excluded.full_name,
    phone = excluded.phone,
    role = excluded.role,
    vehicle_type = excluded.vehicle_type,
    plate_number = excluded.plate_number,
    approval_status = excluded.approval_status,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

alter table public.profiles enable row level security;
alter table public.bookings enable row level security;
alter table public.bookings replica identity full;

grant select, insert, update on public.profiles to anon, authenticated;
grant select, insert, update on public.bookings to anon, authenticated;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all"
  on public.profiles
  for select
  using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "bookings_select_related_or_pending_driver" on public.bookings;
create policy "bookings_select_related_or_pending_driver"
  on public.bookings
  for select
  using (
    auth.uid() = passenger_id
    or auth.uid() = driver_id
    or (
      driver_id is null
      and status = 'pending'
      and exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'driver'
      )
    )
  );

drop policy if exists "bookings_insert_passenger" on public.bookings;
create policy "bookings_insert_passenger"
  on public.bookings
  for insert
  with check (auth.uid() = passenger_id);

drop policy if exists "bookings_update_passenger_or_driver" on public.bookings;
create policy "bookings_update_passenger_or_driver"
  on public.bookings
  for update
  using (
    auth.uid() = passenger_id
    or auth.uid() = driver_id
    or (
      driver_id is null
      and status = 'pending'
      and exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'driver'
      )
    )
  )
  with check (
    auth.uid() = passenger_id
    or auth.uid() = driver_id
    or (
      driver_id = auth.uid()
      and exists (
        select 1 from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'driver'
      )
    )
  );

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.bookings;
    alter publication supabase_realtime add table public.profiles;
  end if;
exception
  when duplicate_object then null;
end $$;
