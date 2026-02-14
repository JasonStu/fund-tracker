# User Funds Storage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将用户基金列表从 localStorage 迁移到 Supabase 数据库，支持持有份额和成本价存储。

**Architecture:** 新建 user_funds 表，通过 API 路由暴露 CRUD 接口，前端调用 API 替换 localStorage 逻辑。

**Tech Stack:** Next.js 16, Supabase, TypeScript, Tailwind CSS

---

## Task 1: Create Database Migration

**Files:**
- Modify: `supabase/setup.sql`

**Step 1: Add user_funds table to setup.sql**

在文件末尾添加：

```sql
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

-- 12. Create RLS policy for user_funds
create policy "Users can manage own funds"
  on public.user_funds for all
  using (auth.uid() = user_id);
```

**Step 2: Commit**

```bash
git add supabase/setup.sql
git commit -m "feat: add user_funds table for storing user holdings"
```

---

## Task 2: Create TypeScript Types

**Files:**
- Modify: `src/types/index.ts`

**Step 1: Add UserFund type**

在文件末尾添加：

```typescript
export interface UserFund {
  id: string;
  user_id: string;
  fund_code: string;
  fund_name: string;
  shares: number;
  cost: number;
  created_at: string;
  updated_at: string;
}

export interface UserFundWithValue extends UserFund {
  nav: number;
  estimatedNav: number;
  estimatedChange: number;
  estimatedChangePercent: number;
  currentValue: number;
  totalCost: number;
  profit: number;
  profitPercent: number;
}
```

**Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add UserFund and UserFundWithValue types"
```

---

## Task 3: Create GET API Route

**Files:**
- Create: `src/app/api/user-funds/route.ts`

**Step 1: Write GET handler**

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { UserFundWithValue } from '@/types';

export async function GET() {
  const supabase = createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: userFunds, error } = await supabase
    .from('user_funds')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch realtime valuation for each fund
  const fundCodes = userFunds.map(f => f.fund_code);
  if (fundCodes.length === 0) {
    return NextResponse.json([]);
  }

  // Call the realtime API to get valuations
  const valuations = await Promise.all(
    fundCodes.map(async (code) => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/funds/realtime?code=${code}`);
        return res.json();
      } catch {
        return null;
      }
    })
  );

  // Merge user fund data with realtime valuation
  const result: UserFundWithValue[] = userFunds.map((fund, index) => {
    const valuation = valuations[index];
    const nav = valuation?.nav || 0;
    const estimatedNav = valuation?.estimatedNav || nav;
    const estimatedChange = valuation?.estimatedChange || 0;
    const estimatedChangePercent = valuation?.estimatedChangePercent || 0;
    const currentValue = fund.shares * estimatedNav;
    const totalCost = fund.shares * fund.cost;
    const profit = currentValue - totalCost;
    const profitPercent = totalCost > 0 ? (profit / totalCost) * 100 : 0;

    return {
      ...fund,
      nav,
      estimatedNav,
      estimatedChange,
      estimatedChangePercent,
      currentValue,
      totalCost,
      profit,
      profitPercent
    };
  });

  return NextResponse.json(result);
}
```

**Step 2: Commit**

```bash
git add src/app/api/user-funds/route.ts
git commit -m "feat: add GET /api/user-funds route"
```

---

## Task 4: Create POST API Route

**Files:**
- Create: `src/app/api/user-funds/route.ts` (add POST handler to existing file)

**Step 1: Add POST handler**

在 GET handler 后添加：

```typescript
export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { fund_code, fund_name, shares = 0, cost = 0 } = body;

  if (!fund_code) {
    return NextResponse.json({ error: 'fund_code is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('user_funds')
    .insert({
      user_id: user.id,
      fund_code,
      fund_name: fund_name || '',
      shares,
      cost
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Fund already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
```

**Step 2: Commit**

```bash
git add src/app/api/user-funds/route.ts
git commit -m "feat: add POST /api/user-funds route"
```

---

## Task 5: Create DELETE API Route

**Files:**
- Create: `src/app/api/user-funds/[id]/route.ts`

**Step 1: Write DELETE handler**

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const { error } = await supabase
    .from('user_funds')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

**Step 2: Commit**

```bash
git add src/app/api/user-funds/\[id\]/route.ts
git commit -m "feat: add DELETE /api/user-funds/[id] route"
```

---

## Task 6: Create AddFundModal Component

**Files:**
- Create: `src/components/AddFundModal.tsx`

**Step 1: Write modal component**

```typescript
'use client';

import { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';

interface AddFundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (shares: number, cost: number) => void;
  fundName: string;
  fundCode: string;
}

export default function AddFundModal({ isOpen, onClose, onSubmit, fundName, fundCode }: AddFundModalProps) {
  const [shares, setShares] = useState('');
  const [cost, setCost] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(
      parseFloat(shares) || 0,
      parseFloat(cost) || 0
    );
    setShares('');
    setCost('');
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-md rounded-lg bg-[#1a1a25] border border-[#2a2a3a] p-6">
          <DialogTitle className="text-lg font-semibold text-[#e0e0e0] mb-4">
            添加基金
          </DialogTitle>

          <div className="mb-4 p-3 bg-[#0d0d15] rounded border border-[#2a2a3a]">
            <div className="text-sm text-[#e0e0e0] font-medium">{fundName}</div>
            <div className="text-xs text-gray-500">{fundCode}</div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">持有份额</label>
              <input
                type="number"
                step="0.0001"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                placeholder="0.0000"
                className="w-full px-3 py-2 bg-[#0d0d15] border border-[#2a2a3a] rounded text-[#e0e0e0] placeholder-gray-500 focus:border-[#00ffff] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">成本单价（元）</label>
              <input
                type="number"
                step="0.000001"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0.000000"
                className="w-full px-3 py-2 bg-[#0d0d15] border border-[#2a2a3a] rounded text-[#e0e0e0] placeholder-gray-500 focus:border-[#00ffff] focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-400 hover:text-[#e0e0e0] transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-[#00ffff] text-[#0d0d15] font-medium rounded hover:bg-[#00cccc] transition-colors"
              >
                添加
              </button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/AddFundModal.tsx
git commit -m "feat: add AddFundModal component"
```

---

## Task 7: Update Homepage to Use API

**Files:**
- Modify: `src/app/(dashboard)/page.tsx`

**Step 1: Replace localStorage logic with API calls**

修改 imports：

```typescript
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { UserFundWithValue } from '@/types';
```

修改 state（替换 myFunds）：

```typescript
const [userFunds, setUserFunds] = useState<UserFundWithValue[]>([]);
const [query, setQuery] = useState('');
const [searchResults, setSearchResults] = useState<SearchFund[]>([]);
const [loading, setLoading] = useState(false);
const [addModalOpen, setAddModalOpen] = useState(false);
const [pendingFund, setPendingFund] = useState<SearchFund | null>(null);

// Replace myFunds with userFunds
const myFunds = userFunds.map(f => f.fund_code);
```

修改 useEffect 加载数据：

```typescript
useEffect(() => {
  const fetchUserFunds = async () => {
    try {
      const res = await axios.get('/api/user-funds');
      setUserFunds(res.data || []);
    } catch (e) {
      console.error('Failed to fetch user funds', e);
    }
  };

  fetchUserFunds();
}, []);
```

修改 addFund 函数：

```typescript
const addFund = (fund: SearchFund | null) => {
  if (fund) {
    setPendingFund(fund);
    setAddModalOpen(true);
  }
  setQuery('');
  setSearchResults([]);
};

const handleAddFundConfirm = async (shares: number, cost: number) => {
  if (!pendingFund) return;

  try {
    await axios.post('/api/user-funds', {
      fund_code: pendingFund.code,
      fund_name: pendingFund.name,
      shares,
      cost
    });

    // Refresh list
    const res = await axios.get('/api/user-funds');
    setUserFunds(res.data || []);
  } catch (e) {
    console.error('Failed to add fund', e);
  }

  setAddModalOpen(false);
  setPendingFund(null);
};
```

修改 removeFund 函数：

```typescript
const removeFund = async (id: string) => {
  try {
    await axios.delete(`/api/user-funds/${id}`);
    setUserFunds(userFunds.filter(f => f.id !== id));
  } catch (e) {
    console.error('Failed to remove fund', e);
  }
};
```

**Step 2: Update UI to show holding info**

在基金列表项中添加市值和收益显示（替换原有展示区域）：

```typescript
// 在 fund item 中显示
<div className="text-right w-20">
  <div className="text-xs text-gray-500">{t('table.shares')}</div>
  <div className="text-sm text-[#e0e0e0]">{numeral(fund.shares).format('0,0.0000')}</div>
</div>
<div className="text-right w-20">
  <div className="text-xs text-gray-500">{t('table.cost')}</div>
  <div className="text-sm text-[#e0e0e0]">{numeral(fund.cost).format('0.000000')}</div>
</div>
<div className="text-right w-24">
  <div className="text-xs text-gray-500">{t('table.currentValue')}</div>
  <div className="text-sm text-[#e0e0e0]">{numeral(fund.currentValue).format('0,0.00')}</div>
</div>
<div className="text-right w-20">
  <div className="text-xs text-gray-500">{t('table.profit')}</div>
  <div className={`text-sm font-semibold ${
    fund.profit >= 0 ? 'text-[#ff3333]' : 'text-[#33ff33]'
  }`}>
    {fund.profit >= 0 ? '+' : ''}{numeral(fund.profit).format('0,0.00')}
  </div>
</div>
<div className="text-right w-16">
  <div className="text-xs text-gray-500">{t('table.profitPercent')}</div>
  <div className={`text-sm font-semibold ${
    fund.profitPercent >= 0 ? 'text-[#ff3333]' : 'text-[#33ff33]'
  }`}>
    {fund.profitPercent >= 0 ? '+' : ''}{numeral(fund.profitPercent).format('0.00')}%
  </div>
</div>
```

删除按钮改为使用 id：

```typescript
<button
  onClick={(e) => {
    e.preventDefault();
    removeFund(fund.id);
  }}
>
```

添加 AddFundModal 组件：

```typescript
<AddFundModal
  isOpen={addModalOpen}
  onClose={() => {
    setAddModalOpen(false);
    setPendingFund(null);
  }}
  onSubmit={handleAddFundConfirm}
  fundName={pendingFund?.name || ''}
  fundCode={pendingFund?.code || ''}
/>
```

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/page.tsx
git commit -m "feat: replace localStorage with Supabase API for fund storage"
```

---

## Task 8: Add i18n Keys

**Files:**
- Modify: `messages/zh.json` and `messages/en.json`

**Step 1: Add new translation keys**

在 zh.json 的 Home 部分添加：

```json
"table": {
  "nav": "净值",
  "estNav": "估算净值",
  "estChange": "估算涨跌",
  "shares": "持有份额",
  "cost": "成本价",
  "currentValue": "当前市值",
  "profit": "累计收益",
  "profitPercent": "收益率"
}
```

**Step 2: Commit**

```bash
git add messages/zh.json messages/en.json
git commit -m "feat: add i18n keys for new fund columns"
```

---

## Task 9: Apply Database Migration

**Step 1: Run migration in Supabase SQL Editor**

在 Supabase SQL Editor 中执行 `supabase/setup.sql` 中的新增 SQL（或直接执行 Task 1 中的 SQL）。

**Step 2: Commit**

```bash
git commit --allow-empty -m "chore: apply user_funds table migration"
```

---

## Execution

**Plan complete and saved to `docs/plans/2026-02-14-user-funds-storage-plan.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
