-- Enable pgcrypto extension if not already done
create extension if not exists pgcrypto;

-- 1. Clean up any existing admin user to avoid conflicts
delete from auth.users where email = 'admin@arangkada.ph';
delete from public.profiles where username = 'admin';

-- 2. Insert default admin account into auth.users (linked to public.profiles via trigger)
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) values (
  '00000000-0000-0000-0000-000000000000',
  'd6a13d0a-9d9b-4e1b-85fa-710000000000', -- Static UUID for the system administrator
  'authenticated',
  'authenticated',
  'admin@arangkada.ph',
  crypt('Admin@2025', gen_salt('bf', 10)), -- Hashes 'Admin@2025' securely
  now(),
  null,
  null,
  '{"provider": "email", "providers": ["email"]}',
  '{"role": "admin", "username": "admin", "full_name": "System Administrator", "phone": "09999999999"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
);

-- 3. Confirm profile exists and has correct permissions
select * from public.profiles where role = 'admin';
