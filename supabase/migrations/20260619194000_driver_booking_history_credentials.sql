-- Allow approved demo-driver accounts from public.drivers to read their own
-- assigned booking history and dashboard data without exposing other drivers.

create or replace function public.get_driver_bookings_for_history(
  p_driver_phone text,
  p_driver_password text
)
returns setof public.bookings
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
    select b.*
      from public.bookings b
     where b.driver_id = profile_id
     order by b.created_at desc;
end;
$$;

grant execute on function public.get_driver_bookings_for_history(text, text) to anon, authenticated;
