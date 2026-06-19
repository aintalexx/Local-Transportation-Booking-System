-- Persist profile edit fields used by passenger/driver Edit Profile pages.
alter table public.profiles
  add column if not exists guardian_name text,
  add column if not exists guardian_phone text,
  add column if not exists vehicle_color text,
  add column if not exists account_status text not null default 'Active'
    check (account_status in ('Active', 'Blocked', 'Archived', 'Suspended')),
  add column if not exists updated_at timestamptz not null default now();

-- Non-admin users may edit their own profile details, but not role or approval/account state.
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
      and role = 'admin'
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

drop trigger if exists prevent_restricted_profile_field_changes_trigger on public.profiles;
create trigger prevent_restricted_profile_field_changes_trigger
  before update on public.profiles
  for each row
  execute function public.prevent_restricted_profile_field_changes();

-- Keep the existing app-compatible select policy, but make own update explicit.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Public bucket used by the existing image upload helper.
insert into storage.buckets (id, name, public)
values ('driver-documents', 'driver-documents', true)
on conflict (id) do update set public = true;

drop policy if exists "driver_documents_public_read" on storage.objects;
create policy "driver_documents_public_read"
  on storage.objects
  for select
  using (bucket_id = 'driver-documents');

drop policy if exists "driver_documents_authenticated_upload_own" on storage.objects;
create policy "driver_documents_authenticated_upload_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'driver-documents'
    and (storage.foldername(name))[1] in ('profiles', 'documents', 'vehicles')
  );

drop policy if exists "driver_documents_authenticated_update_own" on storage.objects;
create policy "driver_documents_authenticated_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'driver-documents'
    and (storage.foldername(name))[1] in ('profiles', 'documents', 'vehicles')
  )
  with check (
    bucket_id = 'driver-documents'
    and (storage.foldername(name))[1] in ('profiles', 'documents', 'vehicles')
  );
