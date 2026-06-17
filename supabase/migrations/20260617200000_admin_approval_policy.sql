-- Allow admin users (role = 'admin') to update ANY profile row.
-- This is needed for driver approval/rejection from the admin panel.
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles
  for update
  using (
    exists (
      select 1 from public.profiles as p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles as p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- Also allow admins to select all profiles (already covered by profiles_select_all,
-- but kept here for clarity)
