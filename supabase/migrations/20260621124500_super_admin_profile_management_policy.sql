-- Super Admin panel needs to manage admin/user profile records.
-- The older policy allowed role = 'admin' only, so super_admin updates could affect zero rows.
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles
  for update
  using (
    exists (
      select 1
      from public.profiles as p
      where p.id = auth.uid()
        and p.role in ('admin', 'super_admin')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles as p
      where p.id = auth.uid()
        and p.role in ('admin', 'super_admin')
    )
  );

create or replace function public.prevent_restricted_profile_field_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_admin boolean;
begin
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'super_admin')
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
