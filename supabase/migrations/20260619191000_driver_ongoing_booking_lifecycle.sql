-- Restore the driver ongoing-booking lifecycle across devices.
-- Driver accounts that sign in through the approved drivers table can now
-- reload assigned active bookings, update trip status, and use ride chat.

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
      'driver_arriving',
      'en_route',
      'passenger_picked_up',
      'arrived',
      'in_progress',
      'completed',
      'ride_completed',
      'cancelled',
      'rejected'
    )
  );

alter table public.bookings replica identity full;
alter table public.chat_messages replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.bookings;
    alter publication supabase_realtime add table public.chat_messages;
  end if;
exception
  when duplicate_object then null;
end $$;

create or replace function public.get_active_booking_for_driver(
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
  active_booking public.bookings%rowtype;
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
    return null;
  end if;

  profile_id := public.ensure_driver_profile_from_application(driver_record);

  select *
    into active_booking
    from public.bookings
   where driver_id = profile_id
     and status in ('accepted', 'driver_arriving', 'en_route', 'passenger_picked_up', 'arrived', 'in_progress')
   order by created_at desc
   limit 1;

  return active_booking;
end;
$$;

create or replace function public.update_booking_status_as_driver(
  p_booking_id uuid,
  p_driver_phone text,
  p_driver_password text,
  p_status text
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  driver_record public.drivers%rowtype;
  profile_id uuid;
  updated_booking public.bookings%rowtype;
  normalized_phone text;
begin
  if p_status not in ('driver_arriving', 'en_route', 'passenger_picked_up', 'arrived', 'in_progress', 'completed', 'cancelled') then
    raise exception 'Invalid booking status.';
  end if;

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

  update public.bookings
     set status = p_status,
         completed_at = case when p_status = 'completed' then now() else completed_at end
   where id = p_booking_id
     and driver_id = profile_id
     and status in ('accepted', 'driver_arriving', 'en_route', 'passenger_picked_up', 'arrived', 'in_progress')
   returning * into updated_booking;

  return updated_booking;
end;
$$;

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
      and status in (
        'accepted',
        'driver_arriving',
        'en_route',
        'passenger_picked_up',
        'arrived',
        'in_progress',
        'completed',
        'ride_completed',
        'cancelled',
        'rejected'
      )
      and exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role = 'driver'
          and profiles.approval_status = 'approved'
      )
    )
  );

drop policy if exists "chat_messages_insert_ride_participants" on public.chat_messages;
create policy "chat_messages_insert_ride_participants"
  on public.chat_messages
  for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.bookings
      where bookings.id = chat_messages.booking_id
        and bookings.status in (
          'accepted',
          'driver_arriving',
          'en_route',
          'passenger_picked_up',
          'arrived',
          'in_progress'
        )
        and (
          (chat_messages.sender_role = 'passenger' and bookings.passenger_id = auth.uid())
          or (chat_messages.sender_role = 'driver' and bookings.driver_id = auth.uid())
        )
    )
  );

create or replace function public.get_chat_messages_for_driver(
  p_booking_id uuid,
  p_driver_phone text,
  p_driver_password text
)
returns setof public.chat_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  driver_record public.drivers%rowtype;
  profile_id uuid;
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

  profile_id := public.ensure_driver_profile_from_application(driver_record);

  return query
    select cm.*
      from public.chat_messages cm
      join public.bookings b on b.id = cm.booking_id
     where cm.booking_id = p_booking_id
       and b.driver_id = profile_id
     order by cm.created_at asc;
end;
$$;

create or replace function public.send_chat_message_as_driver(
  p_booking_id uuid,
  p_driver_phone text,
  p_driver_password text,
  p_sender_name text,
  p_sender_username text,
  p_message text
)
returns public.chat_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  driver_record public.drivers%rowtype;
  profile_id uuid;
  inserted_message public.chat_messages%rowtype;
  normalized_phone text;
begin
  if char_length(trim(coalesce(p_message, ''))) < 1 or char_length(trim(coalesce(p_message, ''))) > 500 then
    raise exception 'Message must be 1 to 500 characters.';
  end if;

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

  if not exists (
    select 1
      from public.bookings
     where id = p_booking_id
       and driver_id = profile_id
       and status in ('accepted', 'driver_arriving', 'en_route', 'passenger_picked_up', 'arrived', 'in_progress')
  ) then
    raise exception 'Driver is not assigned to an active booking.';
  end if;

  insert into public.chat_messages (
    booking_id,
    sender_id,
    sender_role,
    sender_name,
    sender_username,
    message
  )
  values (
    p_booking_id,
    profile_id,
    'driver',
    coalesce(nullif(trim(p_sender_name), ''), 'Driver'),
    nullif(trim(coalesce(p_sender_username, '')), ''),
    trim(p_message)
  )
  returning * into inserted_message;

  return inserted_message;
end;
$$;

grant execute on function public.get_active_booking_for_driver(text, text) to anon, authenticated;
grant execute on function public.update_booking_status_as_driver(uuid, text, text, text) to anon, authenticated;
grant execute on function public.get_chat_messages_for_driver(uuid, text, text) to anon, authenticated;
grant execute on function public.send_chat_message_as_driver(uuid, text, text, text, text, text) to anon, authenticated;
