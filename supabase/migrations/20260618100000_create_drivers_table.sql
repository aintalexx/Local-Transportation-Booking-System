-- Create the drivers table to store driver applications
create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  first_name text not null,
  middle_name text,
  surname text not null,
  suffix text,
  birthdate text not null,
  password text not null,
  profile_photo text,
  valid_id_photo text,
  or_cr_photo text,
  clearance_photo text,
  vehicle_photo text,
  license_number text,
  plate_number text,
  vehicle_type text default 'Tricycle',
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  account_status text not null default 'Active' check (account_status in ('Active', 'Blocked', 'Archived', 'Suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable Row Level Security (RLS)
alter table public.drivers enable row level security;

-- Policies for public.drivers table
drop policy if exists "drivers_select_all" on public.drivers;
create policy "drivers_select_all" on public.drivers for select using (true);

drop policy if exists "drivers_insert_all" on public.drivers;
create policy "drivers_insert_all" on public.drivers for insert with check (true);

drop policy if exists "drivers_update_all" on public.drivers;
create policy "drivers_update_all" on public.drivers for update using (true) with check (true);

-- Grant permissions
grant select, insert, update on public.drivers to anon, authenticated;

-- Add table to realtime publication
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.drivers;
  end if;
exception
  when duplicate_object then null;
end $$;
