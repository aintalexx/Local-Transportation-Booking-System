create table if not exists public.app_sessions (
  session_id text primary key,
  account_key text not null,
  profile_id uuid references public.profiles(id) on delete cascade,
  username text,
  email text,
  role text,
  device_id text not null,
  device_name text not null,
  trusted boolean not null default false,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);

create index if not exists app_sessions_account_active_idx
  on public.app_sessions (account_key, revoked_at, last_seen_at desc);

create index if not exists app_sessions_profile_active_idx
  on public.app_sessions (profile_id, revoked_at, last_seen_at desc);

alter table public.app_sessions enable row level security;

grant select, insert, update on public.app_sessions to anon, authenticated;

drop policy if exists "app_sessions_select_demo" on public.app_sessions;
create policy "app_sessions_select_demo"
  on public.app_sessions
  for select
  using (true);

drop policy if exists "app_sessions_insert_demo" on public.app_sessions;
create policy "app_sessions_insert_demo"
  on public.app_sessions
  for insert
  with check (true);

drop policy if exists "app_sessions_update_demo" on public.app_sessions;
create policy "app_sessions_update_demo"
  on public.app_sessions
  for update
  using (true)
  with check (true);
