-- Supabase Database Setup for Fund Tracker Invitation System
-- Run this in your Supabase SQL Editor

-- 1. Create user_profiles table to store user roles
create table if not exists public.user_profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. Enable RLS on user_profiles
alter table public.user_profiles enable row level security;

-- 3. Create policies for user_profiles
-- Users can view their own profile
create policy "Users can view their own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

-- Users can insert their own profile (auto-created on signup)
create policy "Users can insert their own profile"
  on public.user_profiles for insert
  with check (auth.uid() = id);

-- Admins can view all profiles
create policy "Admins can view all profiles"
  on public.user_profiles for select
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admins can update profiles
create policy "Admins can update profiles"
  on public.user_profiles for update
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 4. Create invitation_codes table
create table if not exists public.invitation_codes (
  id uuid default gen_random_uuid() primary key,
  code varchar(20) unique not null,
  used_by text,
  used_at timestamp with time zone,
  created_by uuid references public.user_profiles(id),
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone,
  is_active boolean default true
);

-- 5. Enable RLS on invitation_codes
alter table public.invitation_codes enable row level security;

-- 6. Create policies for invitation_codes
-- Everyone can view active, unused invitation codes (for validation)
create policy "Anyone can validate active invitation codes"
  on public.invitation_codes for select
  using (
    is_active = true
    and (expires_at is null or expires_at > now())
    and used_by is null
  );

-- Admins can do everything with invitation codes
create policy "Admins can manage invitation codes"
  on public.invitation_codes for all
  using (
    exists (
      select 1 from public.user_profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- 7. Create a function to auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, email, role)
  values (new.id, new.email, 'user');
  return new;
end;
$$ language plpgsql security definer;

-- 8. Create trigger for new user signup
-- Drop existing trigger if it exists
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 9. Create admin user (replace with your admin email)
-- Note: You'll need to sign up first, then run this with the user's ID
-- To get the user ID after signup:
--   select id from auth.users where email = 'admin@example.com';

-- Example (run after admin user is created):
-- insert into public.user_profiles (id, email, role)
-- values ('user-id-here', 'admin@example.com', 'admin')
-- on conflict (id) do update set role = 'admin';

-- 10. Create user_funds table for storing user fund holdings
create table if not exists public.user_funds (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  fund_code varchar(20) not null,
  fund_name text,
  shares numeric(18, 4) not null default 0,
  cost numeric(18, 6) not null default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  unique(user_id, fund_code)
);

-- 11. Enable RLS on user_funds
alter table public.user_funds enable row level security;

-- 12. Create policies for user_funds
-- Users can view and manage their own funds
create policy "Users can manage own funds"
  on public.user_funds for all
  using (auth.uid() = user_id);
