-- Keep driver admin approval, public profile, and Supabase Auth in sync.
-- Driver phone numbers are demo data, so approval must not depend on SMS verification.

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
    driver_record.id,
    concat('driver_', regexp_replace(coalesce(driver_record.phone, ''), '\D', '', 'g')),
    lower(auth_user.email),
    coalesce(nullif(driver_full_name, ''), 'Driver'),
    driver_record.phone,
    'driver',
    coalesce(driver_record.vehicle_type, 'Tricycle'),
    driver_record.plate_number,
    driver_record.license_number,
    driver_record.valid_id_photo,
    driver_record.valid_id_photo,
    driver_record.or_cr_photo,
    driver_record.clearance_photo,
    driver_record.vehicle_photo,
    driver_record.profile_photo,
    'approved',
    'Active',
    driver_record.first_name,
    driver_record.middle_name,
    driver_record.surname,
    driver_record.suffix,
    driver_record.birthdate,
    driver_record.created_at,
    now()
  from auth.users auth_user
  where auth_user.id = driver_record.id
  on conflict (id) do update set
    username = excluded.username,
    email = coalesce(excluded.email, public.profiles.email),
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
    account_status = 'Active',
    first_name = excluded.first_name,
    middle_name = excluded.middle_name,
    surname = excluded.surname,
    suffix = excluded.suffix,
    birthdate = excluded.birthdate,
    registration_date = coalesce(public.profiles.registration_date, excluded.registration_date),
    updated_at = now()
  returning * into synced_profile;

  if synced_profile.id is null then
    raise exception 'Matching Supabase Auth user was not found for this driver.';
  end if;

  update auth.users
     set email_confirmed_at = coalesce(email_confirmed_at, now()),
         confirmed_at = coalesce(confirmed_at, now()),
         updated_at = now(),
         raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
           || jsonb_build_object(
             'role', 'driver',
             'approval_status', 'approved',
             'account_status', 'Active'
           )
   where id = driver_record.id;

  return synced_profile;
end;
$$;

grant execute on function public.approve_driver_application(uuid) to authenticated;
