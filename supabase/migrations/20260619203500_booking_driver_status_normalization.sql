-- Keep driver booking visibility working for approved phone-login drivers.
-- Some existing driver rows store account_status with different casing or null,
-- so normalize status checks before returning/accepting booking requests.

alter table public.bookings replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.bookings;
  end if;
exception
  when duplicate_object then null;
end $$;

create or replace function public.get_available_bookings_for_driver(
  p_driver_phone text,
  p_driver_password text default null,
  p_vehicle_type text default 'Tricycle'
)
returns setof public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  driver_record public.drivers%rowtype;
  normalized_phone text;
begin
  normalized_phone := regexp_replace(coalesce(p_driver_phone, ''), '\D', '', 'g');

  select *
    into driver_record
    from public.drivers
   where regexp_replace(coalesce(phone, ''), '\D', '', 'g') = normalized_phone
     and lower(coalesce(approval_status, '')) = 'approved'
     and lower(coalesce(account_status, 'active')) = 'active'
   limit 1;

  if not found then
    return;
  end if;

  perform public.ensure_driver_profile_from_application(driver_record);

  return query
    select b.*
      from public.bookings b
     where b.driver_id is null
       and lower(coalesce(b.status::text, '')) in ('pending', 'searching', 'available')
       and (
         nullif(p_vehicle_type, '') is null
         or lower(coalesce(b.vehicle_type, '')) = lower(p_vehicle_type)
       )
     order by b.created_at asc;
end;
$$;

create or replace function public.accept_booking_as_driver(
  p_booking_id uuid,
  p_driver_phone text,
  p_driver_password text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  driver_record public.drivers%rowtype;
  profile_id uuid;
  accepted_booking public.bookings%rowtype;
  normalized_phone text;
  driver_full_name text;
begin
  normalized_phone := regexp_replace(coalesce(p_driver_phone, ''), '\D', '', 'g');

  select *
    into driver_record
    from public.drivers
   where regexp_replace(coalesce(phone, ''), '\D', '', 'g') = normalized_phone
     and lower(coalesce(approval_status, '')) = 'approved'
     and lower(coalesce(account_status, 'active')) = 'active'
   limit 1;

  if not found then
    return null;
  end if;

  profile_id := public.ensure_driver_profile_from_application(driver_record);
  driver_full_name := trim(concat_ws(' ', driver_record.first_name, driver_record.middle_name, driver_record.surname, driver_record.suffix));

  update public.bookings
     set driver_id = profile_id,
         driver_name = coalesce(nullif(driver_full_name, ''), 'Driver'),
         driver_phone = driver_record.phone,
         driver_vehicle_type = coalesce(driver_record.vehicle_type, 'Tricycle'),
         driver_plate_number = driver_record.plate_number,
         status = 'accepted',
         accepted_at = now()
   where id = p_booking_id
     and driver_id is null
     and lower(coalesce(status::text, '')) in ('pending', 'searching', 'available')
   returning * into accepted_booking;

  return accepted_booking;
end;
$$;

create or replace function public.get_active_booking_for_driver(
  p_driver_phone text,
  p_driver_password text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  driver_record public.drivers%rowtype;
  profile_id uuid;
  active_booking public.bookings%rowtype;
  normalized_phone text;
begin
  normalized_phone := regexp_replace(coalesce(p_driver_phone, ''), '\D', '', 'g');

  select *
    into driver_record
    from public.drivers
   where regexp_replace(coalesce(phone, ''), '\D', '', 'g') = normalized_phone
     and lower(coalesce(approval_status, '')) = 'approved'
     and lower(coalesce(account_status, 'active')) = 'active'
   limit 1;

  if not found then
    return null;
  end if;

  profile_id := public.ensure_driver_profile_from_application(driver_record);

  select *
    into active_booking
    from public.bookings
   where driver_id = profile_id
     and lower(coalesce(status::text, '')) in ('accepted', 'driver_arriving', 'en_route', 'passenger_picked_up', 'arrived', 'in_progress')
   order by created_at desc
   limit 1;

  return active_booking;
end;
$$;

create or replace function public.update_booking_status_as_driver(
  p_booking_id uuid,
  p_driver_phone text,
  p_driver_password text default null,
  p_status text default null
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  driver_record public.drivers%rowtype;
  profile_id uuid;
  updated_booking public.bookings%rowtype;
  normalized_phone text;
begin
  if p_status not in ('driver_arriving', 'en_route', 'passenger_picked_up', 'arrived', 'in_progress', 'completed', 'cancelled') then
    raise exception 'Invalid booking status.';
  end if;

  normalized_phone := regexp_replace(coalesce(p_driver_phone, ''), '\D', '', 'g');

  select *
    into driver_record
    from public.drivers
   where regexp_replace(coalesce(phone, ''), '\D', '', 'g') = normalized_phone
     and lower(coalesce(approval_status, '')) = 'approved'
     and lower(coalesce(account_status, 'active')) = 'active'
   limit 1;

  if not found then
    return null;
  end if;

  profile_id := public.ensure_driver_profile_from_application(driver_record);

  update public.bookings
     set status = p_status,
         completed_at = case when p_status = 'completed' then now() else completed_at end
   where id = p_booking_id
     and driver_id = profile_id
     and lower(coalesce(status::text, '')) in ('accepted', 'driver_arriving', 'en_route', 'passenger_picked_up', 'arrived', 'in_progress')
   returning * into updated_booking;

  return updated_booking;
end;
$$;

grant execute on function public.get_available_bookings_for_driver(text, text, text) to anon, authenticated;
grant execute on function public.accept_booking_as_driver(uuid, text, text) to anon, authenticated;
grant execute on function public.get_active_booking_for_driver(text, text) to anon, authenticated;
grant execute on function public.update_booking_status_as_driver(uuid, text, text, text) to anon, authenticated;
