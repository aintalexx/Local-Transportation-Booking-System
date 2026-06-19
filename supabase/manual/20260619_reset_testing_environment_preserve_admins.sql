-- One-time testing reset for Arangkada.
-- Run this manually in Supabase SQL Editor when you want a clean passenger/driver test environment.
--
-- Keeps:
--   - public.profiles rows where role is admin or super_admin
--   - fare_settings, system settings, audit logs, and admin logs
--
-- Deletes:
--   - passenger/driver/test/sample/dummy public.profiles rows
--   - matching auth.users rows
--   - public.drivers applications
--   - bookings, chat messages, notifications, ratings, ride history/requests,
--     fare records, driver assignments, and driver location test data

begin;

create temp table cleanup_summary (
  entity text primary key,
  deleted_count bigint not null default 0
) on commit preserve rows;

create temp table cleanup_deleted_profile_ids on commit drop as
select id
from public.profiles
where coalesce(role, '') not in ('admin', 'super_admin');

create temp table cleanup_deleted_booking_ids on commit drop as
select id
from public.bookings
where passenger_id in (select id from cleanup_deleted_profile_ids)
   or driver_id in (select id from cleanup_deleted_profile_ids);

create or replace function pg_temp.cleanup_column_exists(p_table_name text, p_column_name text)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = p_table_name
      and column_name = p_column_name
  );
$$;

create or replace function pg_temp.cleanup_delete_related(
  table_name text,
  booking_columns text[],
  user_columns text[],
  delete_all_when_no_match boolean default false
)
returns bigint
language plpgsql
as $$
declare
  col text;
  clauses text[] := array[]::text[];
  sql text;
  rows_deleted bigint := 0;
begin
  if to_regclass(format('public.%I', table_name)) is null then
    return 0;
  end if;

  foreach col in array booking_columns loop
    if pg_temp.cleanup_column_exists(table_name, col) then
      clauses := clauses || format('%I::text in (select id::text from cleanup_deleted_booking_ids)', col);
    end if;
  end loop;

  foreach col in array user_columns loop
    if pg_temp.cleanup_column_exists(table_name, col) then
      clauses := clauses || format('%I::text in (select id::text from cleanup_deleted_profile_ids)', col);
    end if;
  end loop;

  if array_length(clauses, 1) is null then
    if delete_all_when_no_match then
      sql := format('delete from public.%I', table_name);
    else
      return 0;
    end if;
  else
    sql := format('delete from public.%I where %s', table_name, array_to_string(clauses, ' or '));
  end if;

  execute sql;
  get diagnostics rows_deleted = row_count;
  return rows_deleted;
end;
$$;

insert into cleanup_summary values (
  'chat_messages',
  pg_temp.cleanup_delete_related('chat_messages', array['booking_id'], array['sender_id'])
);

insert into cleanup_summary values (
  'notifications',
  pg_temp.cleanup_delete_related('notifications', array['booking_id'], array['user_id', 'recipient_id'])
);

insert into cleanup_summary values (
  'ratings',
  pg_temp.cleanup_delete_related('ratings', array['booking_id'], array['passenger_id', 'driver_id', 'user_id', 'rated_by'])
);

insert into cleanup_summary values (
  'ride_history',
  pg_temp.cleanup_delete_related('ride_history', array['booking_id'], array['passenger_id', 'driver_id', 'user_id'])
);

insert into cleanup_summary values (
  'ride_requests',
  pg_temp.cleanup_delete_related('ride_requests', array['booking_id'], array['passenger_id', 'driver_id', 'user_id'])
);

insert into cleanup_summary values (
  'fare_records',
  pg_temp.cleanup_delete_related('fare_records', array['booking_id'], array['passenger_id', 'driver_id', 'user_id'])
);

insert into cleanup_summary values (
  'driver_assignments',
  pg_temp.cleanup_delete_related('driver_assignments', array['booking_id'], array['driver_id', 'user_id'])
);

insert into cleanup_summary values (
  'driver_locations',
  pg_temp.cleanup_delete_related('driver_locations', array['booking_id'], array['driver_id', 'user_id', 'driver_username'])
);

with deleted as (
  delete from public.bookings
  where id in (select id from cleanup_deleted_booking_ids)
  returning 1
)
insert into cleanup_summary
select 'bookings', count(*)
from deleted;

with deleted as (
  delete from public.drivers
  returning 1
)
insert into cleanup_summary
select 'drivers', count(*)
from deleted;

with deleted as (
  delete from auth.users
  where id in (select id from cleanup_deleted_profile_ids)
  returning 1
)
insert into cleanup_summary
select 'auth_users', count(*)
from deleted;

with deleted as (
  delete from public.profiles
  where id in (select id from cleanup_deleted_profile_ids)
  returning 1
)
insert into cleanup_summary
select 'profiles', count(*)
from deleted;

commit;

-- Cleanup summary.
select *
from cleanup_summary
order by entity;

-- Accounts preserved.
select role, count(*) as remaining_accounts
from public.profiles
group by role
order by role;

-- Verification checks. All non-admin/super_admin and test-data counts should be 0.
select 'non_admin_profiles' as check_name, count(*) as remaining_count
from public.profiles
where coalesce(role, '') not in ('admin', 'super_admin')
union all
select 'driver_applications', count(*) from public.drivers
union all
select 'bookings', count(*) from public.bookings
union all
select 'chat_messages', count(*) from public.chat_messages
union all
select 'driver_locations', count(*) from public.driver_locations;

-- Orphan checks. These should also return 0.
select 'orphan_bookings' as check_name, count(*) as orphan_count
from public.bookings b
left join public.profiles passenger on passenger.id = b.passenger_id
left join public.profiles driver on driver.id = b.driver_id
where passenger.id is null
   or (b.driver_id is not null and driver.id is null)
union all
select 'orphan_chat_messages', count(*)
from public.chat_messages cm
left join public.bookings b on b.id = cm.booking_id
where b.id is null;
