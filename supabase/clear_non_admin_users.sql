-- 1. Delete all non-admin users from Supabase Auth (this automatically deletes from public.profiles via cascade)
delete from auth.users
where id in (
  select id from public.profiles where role != 'admin'
);

-- 2. Clean up any orphaned profiles that are not admin (if there are any without an auth link)
delete from public.profiles
where role != 'admin';
