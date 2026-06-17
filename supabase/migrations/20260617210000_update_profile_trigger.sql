-- Update the user profile trigger to include driver application documents.
-- When a driver registers, these photo URLs and license number are passed in the user metadata,
-- but the original trigger was dropping them.

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
    license_number,
    driver_license_photo,
    valid_id_photo,
    or_cr_photo,
    clearance_photo,
    vehicle_photo,
    profile_photo,
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
    nullif(new.raw_user_meta_data ->> 'license_number', ''),
    nullif(new.raw_user_meta_data ->> 'driver_license_photo', ''),
    nullif(new.raw_user_meta_data ->> 'valid_id_photo', ''),
    nullif(new.raw_user_meta_data ->> 'or_cr_photo', ''),
    nullif(new.raw_user_meta_data ->> 'clearance_photo', ''),
    nullif(new.raw_user_meta_data ->> 'vehicle_photo', ''),
    nullif(new.raw_user_meta_data ->> 'profile_photo', ''),
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
    license_number = excluded.license_number,
    driver_license_photo = excluded.driver_license_photo,
    valid_id_photo = excluded.valid_id_photo,
    or_cr_photo = excluded.or_cr_photo,
    clearance_photo = excluded.clearance_photo,
    vehicle_photo = excluded.vehicle_photo,
    profile_photo = excluded.profile_photo,
    approval_status = excluded.approval_status,
    updated_at = now();

  return new;
end;
$$;
