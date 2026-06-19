-- Add pricing and booking type columns to bookings
alter table public.bookings
  add column if not exists booking_type text check (booking_type in ('solo', 'group')),
  add column if not exists total_fare numeric check (total_fare >= 0),
  add column if not exists individual_share numeric check (individual_share >= 0),
  add column if not exists split_payment_enabled boolean default false;

-- Backfill existing data
update public.bookings
set
  booking_type = case when ride_type = 'group' then 'group'::text else 'solo'::text end,
  total_fare = coalesce(final_price, 50.00),
  individual_share = coalesce(final_price, 50.00),
  split_payment_enabled = false
where booking_type is null;
