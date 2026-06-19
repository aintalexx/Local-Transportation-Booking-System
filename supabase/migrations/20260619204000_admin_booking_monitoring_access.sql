-- Allow Admin/Super Admin accounts to monitor all booking history.
-- Passenger and driver booking policies remain unchanged.

drop policy if exists "bookings_select_admin_all" on public.bookings;
create policy "bookings_select_admin_all"
  on public.bookings
  for select
  using (
    exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('admin', 'super_admin')
    )
  );

create or replace function public.get_admin_bookings()
returns setof public.bookings
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('admin', 'super_admin')
  ) then
    return;
  end if;

  return query
    select b.*
    from public.bookings b
    order by b.created_at desc;
end;
$$;

grant execute on function public.get_admin_bookings() to authenticated;
