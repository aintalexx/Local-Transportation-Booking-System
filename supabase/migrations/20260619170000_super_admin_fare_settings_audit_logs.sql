-- Support tables used by the standalone Arangkada Super Admin panel.
-- Fare defaults follow src/app/utils/fareCalculator.ts:
-- PHP 16 for the first 1 km, then PHP 5 per succeeding 500 m.

do $$
begin
  alter table public.profiles
    drop constraint if exists profiles_role_check;

  alter table public.profiles
    add constraint profiles_role_check
    check (role in ('passenger', 'driver', 'admin', 'super_admin'));
exception
  when undefined_table then null;
end $$;

create table if not exists public.fare_settings (
  id uuid primary key default gen_random_uuid(),
  solo_base_fare numeric not null default 16 check (solo_base_fare >= 0),
  solo_per_km numeric not null default 10 check (solo_per_km >= 0),
  solo_min_fare numeric not null default 16 check (solo_min_fare >= 0),
  group_base_fare numeric not null default 11 check (group_base_fare >= 0),
  group_per_km numeric not null default 7 check (group_per_km >= 0),
  group_min_fare numeric not null default 11 check (group_min_fare >= 0),
  group_max_passengers integer not null default 5 check (group_max_passengers between 1 and 10),
  surge_multiplier numeric not null default 1 check (surge_multiplier >= 1),
  updated_by text not null default 'System',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  action_type text not null default 'system'
    check (action_type in ('admin', 'fare', 'driver', 'user', 'system')),
  performed_by text not null default 'System',
  target text not null default 'System',
  details text,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_action_type_idx on public.audit_logs (action_type);

alter table public.fare_settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.fare_settings replica identity full;
alter table public.audit_logs replica identity full;

grant select on public.fare_settings to anon, authenticated;
grant select on public.audit_logs to authenticated;
grant insert, update on public.fare_settings to authenticated;
grant insert on public.audit_logs to authenticated;

drop policy if exists "fare_settings_select_all" on public.fare_settings;
create policy "fare_settings_select_all"
  on public.fare_settings
  for select
  using (true);

drop policy if exists "fare_settings_write_super_admin" on public.fare_settings;
create policy "fare_settings_write_super_admin"
  on public.fare_settings
  for all
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'super_admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'super_admin'
    )
  );

drop policy if exists "audit_logs_select_super_admin" on public.audit_logs;
create policy "audit_logs_select_super_admin"
  on public.audit_logs
  for select
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'super_admin'
    )
  );

drop policy if exists "audit_logs_insert_super_admin" on public.audit_logs;
create policy "audit_logs_insert_super_admin"
  on public.audit_logs
  for insert
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'super_admin'
    )
  );

insert into public.fare_settings (
  solo_base_fare,
  solo_per_km,
  solo_min_fare,
  group_base_fare,
  group_per_km,
  group_min_fare,
  group_max_passengers,
  surge_multiplier,
  updated_by
)
select 16, 10, 16, 11, 7, 11, 5, 1, 'Migration'
where not exists (select 1 from public.fare_settings);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.fare_settings;
    alter publication supabase_realtime add table public.audit_logs;
  end if;
exception
  when duplicate_object then null;
end $$;
