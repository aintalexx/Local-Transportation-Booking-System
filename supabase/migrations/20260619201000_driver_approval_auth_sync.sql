-- Keep driver admin approval and public profile in sync.
-- Driver phone numbers are demo data, so approval must not depend on SMS verification.
-- This version does not depend on auth.users because the driver flow can run
-- in phone+password demo mode without Supabase Auth email accounts.

create or replace function public.ensure_driver_profile_from_application(p_driver public.drivers)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_id uuid;
  driver_full_name text;
begin
  profile_id := p_driver.id;
  driver_full_name := trim(concat_ws(' ', p_driver.first_name, p_driver.middle_name, p_driver.surname, p_driver.suffix));
  perform set_config('app.allow_profile_status_sync', 'on', true);

  insert into public.profiles (
    id,
    username,
    email,
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
    account_status,
    first_name,
    middle_name,
    surname,
    suffix,
    birthdate,
    registration_date,
    updated_at
  )
  values (
    profile_id,
    concat('driver_', regexp_replace(coalesce(p_driver.phone, ''), '\D', '', 'g'), '_', left(profile_id::text, 8)),
    null,
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
    coalesce(p_driver.approval_status, 'pending'),
    coalesce(p_driver.account_status, 'Active'),
    p_driver.first_name,
    p_driver.middle_name,
    p_driver.surname,
    p_driver.suffix,
    p_driver.birthdate,
    p_driver.created_at,
    now()
  )
  on conflict (id) do update set
    username = excluded.username,
    email = coalesce(public.profiles.email, excluded.email),
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
    approval_status = coalesce(excluded.approval_status, public.profiles.approval_status, 'pending'),
    account_status = coalesce(excluded.account_status, public.profiles.account_status, 'Active'),
    first_name = excluded.first_name,
    middle_name = excluded.middle_name,
    surname = excluded.surname,
    suffix = excluded.suffix,
    birthdate = excluded.birthdate,
    registration_date = coalesce(public.profiles.registration_date, excluded.registration_date),
    updated_at = now();

  return profile_id;
end;
$$;

create or replace function public.approve_driver_application(p_driver_id uuid)
returns public.profiles
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  driver_record public.drivers%rowtype;
  synced_profile public.profiles%rowtype;
  driver_full_name text;
begin
  select *
    into driver_record
    from public.drivers
   where id = p_driver_id
   limit 1;

  if not found then
    raise exception 'Driver application not found.';
  end if;

  driver_full_name := trim(concat_ws(' ', driver_record.first_name, driver_record.middle_name, driver_record.surname, driver_record.suffix));

  update public.drivers
     set approval_status = 'approved',
         account_status = 'Active',
         updated_at = now()
   where id = p_driver_id
   returning * into driver_record;

  perform set_config('app.allow_profile_status_sync', 'on', true);
  select * into synced_profile
    from public.profiles
   where id = public.ensure_driver_profile_from_application(driver_record);

  return synced_profile;
end;
$$;

grant execute on function public.approve_driver_application(uuid) to authenticated;

-- Backfill every driver application into public.profiles so the database stays
-- synchronized even when auth.users rows are intentionally removed.
insert into public.profiles (
  id,
  username,
  email,
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
  account_status,
  first_name,
  middle_name,
  surname,
  suffix,
  birthdate,
  registration_date,
  updated_at
)
select
  d.id,
  concat('driver_', regexp_replace(coalesce(d.phone, ''), '\D', '', 'g'), '_', left(d.id::text, 8)),
  null,
  coalesce(nullif(trim(concat_ws(' ', d.first_name, d.middle_name, d.surname, d.suffix)), ''), 'Driver'),
  d.phone,
  'driver',
  coalesce(d.vehicle_type, 'Tricycle'),
  d.plate_number,
  d.license_number,
  d.valid_id_photo,
  d.valid_id_photo,
  d.or_cr_photo,
  d.clearance_photo,
  d.vehicle_photo,
  d.profile_photo,
  coalesce(d.approval_status, 'pending'),
  coalesce(d.account_status, 'Active'),
  d.first_name,
  d.middle_name,
  d.surname,
  d.suffix,
  d.birthdate,
  d.created_at,
  now()
from public.drivers d
on conflict (id) do update set
  username = excluded.username,
  email = coalesce(public.profiles.email, excluded.email),
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
  approval_status = coalesce(public.profiles.approval_status, excluded.approval_status),
  account_status = coalesce(public.profiles.account_status, excluded.account_status),
  first_name = excluded.first_name,
  middle_name = excluded.middle_name,
  surname = excluded.surname,
  suffix = excluded.suffix,
  birthdate = excluded.birthdate,
  registration_date = coalesce(public.profiles.registration_date, excluded.registration_date),
  updated_at = now();
