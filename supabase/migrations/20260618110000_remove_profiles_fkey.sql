-- Drop the foreign key constraint from profiles pointing to auth.users.
-- This allows driver profiles to be created and synced from public.drivers
-- even when they don't have a record in the auth.users table (since they register via phone number only).

alter table public.profiles
  drop constraint if exists profiles_id_fkey;
