-- One-time sync for existing users after the booking/profile schema split.
-- Drivers are stored in public.drivers, while passengers/admins/auth users live in public.profiles.
-- This migration normalizes both sides into public.profiles so booking RLS and realtime use one profile source.

alter table public.profiles
  add column if not exists email text,
  add column if not exists first_name text,
  add column if not exists middle_name text,
  add column if not exists surname text,
  add column if not exists suffix text,
  add column if not exists birthdate text,
  add column if not exists registration_date timestamptz,
  add column if not exists guardian_name text,
  add column if not exists guardian_phone text,
  add column if not exists account_status text not null default 'Active'
    check (account_status in ('Active', 'Blocked', 'Archived', 'Suspended'));

-- Keep user-facing profile edits protected, but allow trusted database sync functions/migrations
-- to repair role/approval/account status mismatches.
create or replace function public.prevent_restricted_profile_field_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
begin
  if current_setting('app.allow_profile_status_sync', true) = 'on' then
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
  end if;

  new.updated_at = now();
  return new;
end;
$$;

-- Allow this trusted migration to normalize restricted profile fields.
do $$
begin
  if exists (
    select 1
    from pg_trigger
    where tgname = 'prevent_restricted_profile_field_changes_trigger'
      and tgrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles disable trigger prevent_restricted_profile_field_changes_trigger;
  end if;
end $$;

-- Sync existing Supabase Auth users into profiles.
-- This mainly covers passengers and Google/email accounts.
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
  first_name,
  middle_name,
  surname,
  suffix,
  birthdate,
  guardian_name,
  guardian_phone,
  account_status,
  registration_date,
  updated_at
)
select
  u.id,
  nullif(u.raw_user_meta_data ->> 'username', ''),
  lower(u.email),
  coalesce(nullif(u.raw_user_meta_data ->> 'full_name', ''), split_part(u.email, '@', 1), 'New User'),
  nullif(u.raw_user_meta_data ->> 'phone', ''),
  coalesce(nullif(u.raw_user_meta_data ->> 'role', ''), 'passenger'),
  nullif(u.raw_user_meta_data ->> 'vehicle_type', ''),
  nullif(u.raw_user_meta_data ->> 'plate_number', ''),
  nullif(u.raw_user_meta_data ->> 'license_number', ''),
  nullif(u.raw_user_meta_data ->> 'driver_license_photo', ''),
  nullif(u.raw_user_meta_data ->> 'valid_id_photo', ''),
  nullif(u.raw_user_meta_data ->> 'or_cr_photo', ''),
  nullif(u.raw_user_meta_data ->> 'clearance_photo', ''),
  nullif(u.raw_user_meta_data ->> 'vehicle_photo', ''),
  nullif(u.raw_user_meta_data ->> 'profile_photo', ''),
  coalesce(
    nullif(u.raw_user_meta_data ->> 'approval_status', ''),
    case when (u.raw_user_meta_data ->> 'role') = 'driver' then 'pending' else 'approved' end
  ),
  nullif(u.raw_user_meta_data ->> 'first_name', ''),
  nullif(u.raw_user_meta_data ->> 'middle_name', ''),
  nullif(u.raw_user_meta_data ->> 'surname', ''),
  nullif(u.raw_user_meta_data ->> 'suffix', ''),
  nullif(u.raw_user_meta_data ->> 'birthdate', ''),
  nullif(u.raw_user_meta_data ->> 'guardian_name', ''),
  nullif(u.raw_user_meta_data ->> 'guardian_phone', ''),
  coalesce(nullif(u.raw_user_meta_data ->> 'account_status', ''), 'Active'),
  u.created_at,
  now()
from auth.users u
on conflict (id) do update set
  username = coalesce(public.profiles.username, excluded.username),
  email = coalesce(public.profiles.email, excluded.email),
  full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
  phone = coalesce(nullif(public.profiles.phone, ''), excluded.phone),
  role = coalesce(nullif(public.profiles.role, ''), excluded.role),
  vehicle_type = coalesce(public.profiles.vehicle_type, excluded.vehicle_type),
  plate_number = coalesce(public.profiles.plate_number, excluded.plate_number),
  license_number = coalesce(public.profiles.license_number, excluded.license_number),
  driver_license_photo = coalesce(public.profiles.driver_license_photo, excluded.driver_license_photo),
  valid_id_photo = coalesce(public.profiles.valid_id_photo, excluded.valid_id_photo),
  or_cr_photo = coalesce(public.profiles.or_cr_photo, excluded.or_cr_photo),
  clearance_photo = coalesce(public.profiles.clearance_photo, excluded.clearance_photo),
  vehicle_photo = coalesce(public.profiles.vehicle_photo, excluded.vehicle_photo),
  profile_photo = coalesce(public.profiles.profile_photo, excluded.profile_photo),
  approval_status = coalesce(public.profiles.approval_status, excluded.approval_status),
  first_name = coalesce(public.profiles.first_name, excluded.first_name),
  middle_name = coalesce(public.profiles.middle_name, excluded.middle_name),
  surname = coalesce(public.profiles.surname, excluded.surname),
  suffix = coalesce(public.profiles.suffix, excluded.suffix),
  birthdate = coalesce(public.profiles.birthdate, excluded.birthdate),
  guardian_name = coalesce(public.profiles.guardian_name, excluded.guardian_name),
  guardian_phone = coalesce(public.profiles.guardian_phone, excluded.guardian_phone),
  account_status = coalesce(public.profiles.account_status, excluded.account_status),
  registration_date = coalesce(public.profiles.registration_date, excluded.registration_date),
  updated_at = now();

-- Normalize existing passenger profile records.
update public.profiles
set approval_status = coalesce(approval_status, 'approved'),
    account_status = coalesce(account_status, 'Active'),
    registration_date = coalesce(registration_date, created_at, now()),
    updated_at = now()
where role = 'passenger';

-- Sync all existing approved/active driver applications into profiles immediately.
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
  first_name,
  middle_name,
  surname,
  suffix,
  birthdate,
  account_status,
  registration_date,
  updated_at
)
select
  d.id,
  concat('driver_', regexp_replace(coalesce(d.phone, ''), '\D', '', 'g'), '_', left(d.id::text, 8)),
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
  d.approval_status,
  d.first_name,
  d.middle_name,
  d.surname,
  d.suffix,
  d.birthdate,
  d.account_status,
  d.created_at,
  now()
from public.drivers d
where d.approval_status = 'approved'
  and d.account_status = 'Active'
on conflict (id) do update set
  username = excluded.username,
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
  approval_status = excluded.approval_status,
  first_name = excluded.first_name,
  middle_name = excluded.middle_name,
  surname = excluded.surname,
  suffix = excluded.suffix,
  birthdate = excluded.birthdate,
  account_status = excluded.account_status,
  registration_date = coalesce(public.profiles.registration_date, excluded.registration_date),
  updated_at = now();

create index if not exists profiles_role_phone_idx on public.profiles (role, phone);
create index if not exists profiles_role_status_idx on public.profiles (role, approval_status, account_status);

do $$
begin
  if exists (
    select 1
    from pg_trigger
    where tgname = 'prevent_restricted_profile_field_changes_trigger'
      and tgrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles enable trigger prevent_restricted_profile_field_changes_trigger;
  end if;
end $$;
