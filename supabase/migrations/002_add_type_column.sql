-- Migration: Add type column to support both stocks and funds
-- Run this in your Supabase SQL Editor

-- 1. Add type column to user_funds table
alter table public.user_funds add column if not exists type varchar(10) default 'fund' check (type in ('fund', 'stock'));

-- 2. Add type column to fund_transactions table
alter table public.fund_transactions add column if not exists type varchar(10) default 'fund' check (type in ('fund', 'stock'));

-- 3. Add indexes for better query performance
create index if not exists idx_user_funds_user_type on public.user_funds(user_id, type);
create index if not exists idx_fund_transactions_user_type on public.fund_transactions(user_id, type);
create index if not exists idx_fund_transactions_created on public.fund_transactions(created_at);
