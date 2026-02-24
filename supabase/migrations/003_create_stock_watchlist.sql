-- supabase/migrations/003_create_stock_watchlist.sql

-- 创建 stock_watchlist 表
create table public.stock_watchlist (
  id uuid default gen_random_uuid() primary key,
  type varchar(20) not null default '情报扫描' check (type in ('情报扫描', '金股', '盘中重点')),
  code varchar(20) not null,
  name text not null,
  sector text,
  price_range text,
  strategy text,
  first_profit_price numeric(18, 4),
  stop_loss_price numeric(18, 4),
  position_pct text,
  highlights text,
  created_at timestamp with time zone default now(),
  registered_price numeric(18, 4),
  created_by uuid references auth.users(id)
);

-- 启用 RLS
alter table public.stock_watchlist enable row level security;

-- 所有认证用户可读取
create policy "Authenticated users can read stock_watchlist"
  on public.stock_watchlist for select
  to authenticated
  using (true);

-- 所有认证用户可插入
create policy "Authenticated users can insert stock_watchlist"
  on public.stock_watchlist for insert
  to authenticated
  with check (auth.uid() = created_by);

-- 所有认证用户可删除自己的记录
create policy "Authenticated users can delete stock_watchlist"
  on public.stock_watchlist for delete
  to authenticated
  using (auth.uid() = created_by);
