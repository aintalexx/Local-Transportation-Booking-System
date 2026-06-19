-- Persist passenger and driver profile edits safely.
-- Passengers update their own profile through auth.uid().
-- Approved drivers that use the demo phone-login flow update only allowed fields
-- through a verified driver-credential RPC.

create or replace function public.prevent_restricted_profile_field_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
  allow_system_sync boolean;
begin
  allow_system_sync := coalesce(current_setting('app.allow_profile_status_sync', true), '') = 'on';

  if allow_system_sync then
    new.updated_at = now();
    return new;
  end if;

  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  ) into is_admin;

  if not coalesce(is_admin, false) then
    if new.role is distinct from old.role then
      raise exception 'Users cannot change their own role.';
    end if;

    if new.approval_status is distinct from old.approval_status then
      raise exception 'Users cannot change approval status.';
    end if;

    if new.account_status is distinct from old.account_status then
      raise exception 'Users cannot change account status.';
    end if;

    if old.role = 'driver' then
      if new.phone is distinct from old.phone then
        raise exception 'Drivers cannot change phone number from Edit Profile.';
      end if;

      if new.vehicle_type is distinct from old.vehicle_type then
        raise exception 'Drivers cannot change vehicle type from Edit Profile.';
      end if;

      if new.plate_number is distinct from old.plate_number then
        raise exception 'Drivers cannot change plate number from Edit Profile.';
      end if;

      if new.vehicle_color is distinct from old.vehicle_color then
        raise exception 'Drivers cannot change vehicle color from Edit Profile.';
      end if;

      if new.license_number is distinct from old.license_number then
        raise exception 'Drivers cannot change license number from Edit Profile.';
      end if;

      if new.driver_license_photo is distinct from old.driver_license_photo
        or new.valid_id_photo is distinct from old.valid_id_photo
        or new.or_cr_photo is distinct from old.or_cr_photo
        or new.clearance_photo is distinct from old.clearance_photo
        or new.vehicle_photo is distinct from old.vehicle_photo then
        raise exception 'Drivers cannot change verification documents from Edit Profile.';
      end if;
    end if;
  end if;

  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists prevent_restricted_profile_field_changes_trigger on public.profiles;
create trigger prevent_restricted_profile_field_changes_trigger
  before update on public.profiles
  for each row
  execute function public.prevent_restricted_profile_field_changes();

create or replace function public.update_driver_editable_profile(
  p_driver_phone text,
  p_driver_password text,
  p_username text,
  p_first_name text,
  p_middle_name text,
  p_surname text,
  p_suffix text,
  p_profile_photo text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  driver_record public.drivers%rowtype;
  profile_id uuid;
  saved_profile public.profiles%rowtype;
  normalized_phone text;
  next_username text;
  next_first_name text;
  next_middle_name text;
  next_surname text;
  next_suffix text;
  next_full_name text;
begin
  normalized_phone := regexp_replace(coalesce(p_driver_phone, ''), '\D', '', 'g');
  next_username := nullif(trim(coalesce(p_username, '')), '');
  next_first_name := nullif(trim(regexp_replace(coalesce(p_first_name, ''), '\s+', ' ', 'g')), '');
  next_middle_name := nullif(trim(regexp_replace(coalesce(p_middle_name, ''), '\s+', ' ', 'g')), '');
  next_surname := nullif(trim(regexp_replace(coalesce(p_surname, ''), '\s+', ' ', 'g')), '');
  next_suffix := nullif(trim(regexp_replace(coalesce(p_suffix, ''), '\s+', ' ', 'g')), '');

  if next_username is null then
    raise exception 'Username is required.';
  end if;

  if next_first_name is null or next_surname is null then
    raise exception 'First name and surname are required.';
  end if;

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

  if exists (
    select 1
      from public.profiles
     where lower(username) = lower(next_username)
       and id <> profile_id
  ) then
    raise exception 'Username already exists.';
  end if;

  next_full_name := trim(concat_ws(' ', next_first_name, next_middle_name, next_surname, next_suffix));

  update public.drivers
     set first_name = next_first_name,
         middle_name = next_middle_name,
         surname = next_surname,
         suffix = next_suffix,
         profile_photo = coalesce(nullif(p_profile_photo, ''), profile_photo),
         updated_at = now()
   where id = driver_record.id;

  update public.profiles
     set username = next_username,
         first_name = next_first_name,
         middle_name = next_middle_name,
         surname = next_surname,
         suffix = next_suffix,
         full_name = next_full_name,
         profile_photo = coalesce(nullif(p_profile_photo, ''), profile_photo),
         updated_at = now()
   where id = profile_id
   returning * into saved_profile;

  return saved_profile;
end;
$$;

grant execute on function public.update_driver_editable_profile(text, text, text, text, text, text, text, text) to anon, authenticated;
