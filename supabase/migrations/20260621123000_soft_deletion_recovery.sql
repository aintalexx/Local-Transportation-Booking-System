do $$
declare
  table_name text;
begin
  foreach table_name in array array['profiles', 'drivers', 'bookings', 'ratings']
  loop
    if to_regclass('public.' || table_name) is not null then
      execute format('alter table public.%I add column if not exists is_deleted boolean not null default false', table_name);
      execute format('alter table public.%I add column if not exists deleted_at timestamptz', table_name);
      execute format('alter table public.%I add column if not exists deleted_by uuid references public.profiles(id) on delete set null', table_name);
      execute format('alter table public.%I add column if not exists restored_at timestamptz', table_name);
      execute format('alter table public.%I add column if not exists restored_by uuid references public.profiles(id) on delete set null', table_name);
      execute format('create index if not exists %I on public.%I (is_deleted, deleted_at desc)', table_name || '_soft_delete_idx', table_name);
    end if;
  end loop;
end $$;

grant update on public.profiles to authenticated;

do $$
begin
  if to_regclass('public.drivers') is not null then
    grant update on public.drivers to authenticated;
  end if;
  if to_regclass('public.bookings') is not null then
    grant update on public.bookings to authenticated;
  end if;
  if to_regclass('public.ratings') is not null then
    grant update on public.ratings to authenticated;
  end if;
end $$;
