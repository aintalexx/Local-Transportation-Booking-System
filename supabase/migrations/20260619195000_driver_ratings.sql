-- Driver ratings for completed passenger bookings.

create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  passenger_id uuid not null references public.profiles(id) on delete cascade,
  driver_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  feedback text,
  created_at timestamptz not null default now(),
  unique (booking_id)
);

create index if not exists ratings_driver_id_created_at_idx
  on public.ratings (driver_id, created_at desc);

create index if not exists ratings_passenger_id_created_at_idx
  on public.ratings (passenger_id, created_at desc);

alter table public.ratings enable row level security;
alter table public.ratings replica identity full;

grant select, insert, update, delete on public.ratings to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.ratings;
  end if;
exception
  when duplicate_object then null;
end $$;

drop policy if exists "ratings_select_related_or_admin" on public.ratings;
create policy "ratings_select_related_or_admin"
  on public.ratings
  for select
  using (
    auth.uid() = passenger_id
    or auth.uid() = driver_id
    or exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
    )
  );

drop policy if exists "ratings_insert_passenger_completed_booking" on public.ratings;
create policy "ratings_insert_passenger_completed_booking"
  on public.ratings
  for insert
  with check (
    auth.uid() = passenger_id
    and exists (
      select 1
      from public.bookings
      where bookings.id = ratings.booking_id
        and bookings.passenger_id = auth.uid()
        and bookings.driver_id = ratings.driver_id
        and bookings.status in ('completed', 'ride_completed')
        and bookings.driver_id is not null
    )
  );

drop policy if exists "ratings_update_admin_only" on public.ratings;
create policy "ratings_update_admin_only"
  on public.ratings
  for update
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
    )
  );

drop policy if exists "ratings_delete_admin_only" on public.ratings;
create policy "ratings_delete_admin_only"
  on public.ratings
  for delete
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
    )
  );

create or replace function public.get_driver_rating_summary(
  p_driver_phone text,
  p_driver_password text
)
returns table (
  driver_id uuid,
  average_rating numeric,
  total_ratings bigint,
  recent_feedback jsonb
)
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
    select
      profile_id,
      coalesce(round(avg(r.rating)::numeric, 2), 0) as average_rating,
      count(r.id) as total_ratings,
      coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', ranked.id,
              'rating', ranked.rating,
              'feedback', ranked.feedback,
              'created_at', ranked.created_at,
              'passenger_id', ranked.passenger_id
            )
            order by ranked.created_at desc
          )
          from (
            select id, rating, feedback, created_at, passenger_id
            from public.ratings
            where driver_id = profile_id
              and nullif(trim(coalesce(feedback, '')), '') is not null
            order by created_at desc
            limit 3
          ) ranked
        ),
        '[]'::jsonb
      ) as recent_feedback
    from public.ratings r
    where r.driver_id = profile_id;
end;
$$;

grant execute on function public.get_driver_rating_summary(text, text) to anon, authenticated;
