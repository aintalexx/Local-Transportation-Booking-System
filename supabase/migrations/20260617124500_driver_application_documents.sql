alter table public.profiles
  add column if not exists license_number text,
  add column if not exists driver_license_photo text,
  add column if not exists valid_id_photo text,
  add column if not exists or_cr_photo text,
  add column if not exists clearance_photo text,
  add column if not exists vehicle_photo text,
  add column if not exists profile_photo text;
