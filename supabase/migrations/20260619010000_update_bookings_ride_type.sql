-- Drop the check constraint if it exists.
alter table public.bookings
  drop constraint if exists bookings_ride_type_check;

-- Add the new check constraint allowing 'solo', 'group', 'shared'
alter table public.bookings
  add constraint bookings_ride_type_check check (ride_type in ('solo', 'group', 'shared'));

-- Add passenger_count column (1 to 5) and reserve_entire column
alter table public.bookings
  add column if not exists passenger_count integer default 1 check (passenger_count >= 1 and passenger_count <= 5),
  add column if not exists reserve_entire boolean default false;

