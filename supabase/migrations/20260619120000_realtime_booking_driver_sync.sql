-- Keep passenger-driver booking sync consistent across devices.
-- This migration widens supported booking statuses, ensures realtime is enabled,
-- and narrows open booking visibility to approved drivers.

alter table public.bookings
  drop constraint if exists bookings_status_check;

alter table public.bookings
  add constraint bookings_status_check
  check (
    status in (
      'pending',
      'searching',
      'available',
      'accepted',
      'en_route',
      'arrived',
      'in_progress',
      'completed',
      'ride_completed',
      'cancelled',
      'rejected'
    )
  );

alter table public.bookings replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.bookings;
  end if;
exception
  when duplicate_object then null;
end $$;

drop policy if exists "bookings_select_related_or_pending_driver" on public.bookings;
create policy "bookings_select_related_or_pending_driver"
  on public.bookings
  for select
  using (
    auth.uid() = passenger_id
    or auth.uid() = driver_id
    or (
      driver_id is null
      and status in ('pending', 'searching', 'available')
      and exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'driver'
          and profiles.approval_status = 'approved'
      )
    )
  );

drop policy if exists "bookings_update_passenger_or_driver" on public.bookings;
create policy "bookings_update_passenger_or_driver"
  on public.bookings
  for update
  using (
    auth.uid() = passenger_id
    or auth.uid() = driver_id
    or (
      driver_id is null
      and status in ('pending', 'searching', 'available')
      and exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'driver'
          and profiles.approval_status = 'approved'
      )
    )
  )
  with check (
    auth.uid() = passenger_id
    or auth.uid() = driver_id
    or (
      driver_id = auth.uid()
      and status in ('accepted', 'en_route', 'arrived', 'in_progress', 'completed', 'ride_completed', 'cancelled', 'rejected')
      and exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'driver'
          and profiles.approval_status = 'approved'
      )
    )
  );
