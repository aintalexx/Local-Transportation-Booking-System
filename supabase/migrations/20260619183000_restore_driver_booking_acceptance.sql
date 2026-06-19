-- Restore driver booking visibility/acceptance for the existing demo driver-login flow.
-- Some driver accounts authenticate through the public.drivers table + demo OTP,
-- so these functions verify approved/active driver credentials before reading or claiming bookings.

create or replace function public.ensure_driver_profile_from_application(p_driver public.drivers)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_id uuid;
  driver_full_name text;    ` 
begin
  profile_id := p_driver.id;
  driver_full_name := trim(concat_ws(' ', p_driver.first_name, p_driver.middle_name, p_driver.surname, p_driver.suffix));

  insert into public.profiles (
    id,
    username,
    full_name,
    phone,
    role,
    vehicle_type,
    plate_number,
    license_number,
    driver_license_photo,
    valid_id_photo,
    or_cr_photo,
    clearance_photo,
    vehicle_photo,
    profile_photo,
    approval_status,
    updated_at
  )
  values (
    profile_id,
    concat('driver_', regexp_replace(coalesce(p_driver.phone, ''), '\D', '', 'g'), '_', left(profile_id::text, 8)),
    coalesce(nullif(driver_full_name, ''), 'Driver'),
    p_driver.phone,
    'driver',
    coalesce(p_driver.vehicle_type, 'Tricycle'),
    p_driver.plate_number,
    p_driver.license_number,
    p_driver.valid_id_photo,
    p_driver.valid_id_photo,
    p_driver.or_cr_photo,
    p_driver.clearance_photo,
    p_driver.vehicle_photo,
    p_driver.profile_photo,
    'approved',
    now()
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    phone = excluded.phone,
    role = 'driver',
    vehicle_type = excluded.vehicle_type,
    plate_number = excluded.plate_number,
    license_number = excluded.license_number,
    driver_license_photo = excluded.driver_license_photo,
    valid_id_photo = excluded.valid_id_photo,
    or_cr_photo = excluded.or_cr_photo,
    clearance_photo = excluded.clearance_photo,
    vehicle_photo = excluded.vehicle_photo,
    profile_photo = excluded.profile_photo,
    approval_status = 'approved',
    updated_at = now();

  return profile_id;
end;
$$;

create or replace function public.get_available_bookings_for_driver(
  p_driver_phone text,
  p_driver_password text,
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
     and password = p_driver_password
     and approval_status = 'approved'
     and account_status = 'Active'
   limit 1;

  if not found then
    return;
  end if;

  perform public.ensure_driver_profile_from_application(driver_record);

  return query
    select b.*
      from public.bookings b
     where b.driver_id is null
       and b.status in ('pending', 'searching', 'available')
       and (
         nullif(p_vehicle_type, '') is null
         or lower(b.vehicle_type) = lower(p_vehicle_type)
       )
     order by b.created_at asc;
end;
$$;

create or replace function public.accept_booking_as_driver(
  p_booking_id uuid,
  p_driver_phone text,
  p_driver_password text
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
     and password = p_driver_password
     and approval_status = 'approved'
     and account_status = 'Active'
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
     and status in ('pending', 'searching', 'available')
   returning * into accepted_booking;

  return accepted_booking;
end;
$$;

grant execute on function public.get_available_bookings_for_driver(text, text, text) to anon, authenticated;
grant execute on function public.accept_booking_as_driver(uuid, text, text) to anon, authenticated;
