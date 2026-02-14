# Fund Transactions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现基金持仓和交易记录功能，支持加减仓、数据库排序、前端已存在检查。

**Architecture:** 新建 fund_transactions 表存储交易记录，修改 user_funds 表添加排序字段，前端新增交易弹窗和历史记录组件。

**Tech Stack:** Next.js 16, Supabase, TypeScript, Tailwind CSS

---

## Task 1: Database Migration

**Files:**
- Modify: `supabase/setup.sql`

**Step 1: Add fund_transactions table**

在 setup.sql 末尾添加：

```sql
-- 13. Create fund_transactions table for buy/sell records
create table if not exists public.fund_transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  fund_code varchar(20) not null,
  fund_name text,
  transaction_type varchar(10) not null check (transaction_type in ('buy', 'sell')),
  shares numeric(18, 4) not null,
  price numeric(18, 6) not null,
  notes text,
  created_at timestamp with time zone default now()
);

-- 14. Enable RLS on fund_transactions
alter table public.fund_transactions enable row level security;

-- 15. Create RLS policy for fund_transactions
create policy "Users can manage own transactions"
  on public.fund_transactions for all
  using (auth.uid() = user_id);

-- 16. Add sort_order column to user_funds
alter table public.user_funds add column if not exists sort_order integer;
```

**Step 2: Commit**

```bash
git add supabase/setup.sql
git commit -m "feat: add fund_transactions table and sort_order column"
```

---

## Task 2: Update TypeScript Types

**Files:**
- Modify: `src/types/index.ts`

**Step 1: Add Position and Transaction types**

```typescript
export interface Position {
  id: string;
  user_id: string;
  fund_code: string;
  fund_name: string;
  sort_order: number;
  shares: number;
  avg_cost: number;
  total_buy: number;
  total_sell: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  fund_id: string;
  fund_code: string;
  fund_name: string;
  transaction_type: 'buy' | 'sell';
  shares: number;
  price: number;
  notes?: string;
  created_at: string;
}

export interface TransactionData {
  fund_id: string;
  type: 'buy' | 'sell';
  shares: number;
  price: number;
  notes?: string;
}
```

**Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add Position and Transaction types"
```

---

## Task 3: Create Transactions API Route

**Files:**
- Create: `src/app/api/user-funds/transactions/route.ts`

**Step 1: Write POST handler for transactions**

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { TransactionData } from '@/types';

interface AddTransactionBody {
  fund_id: string;
  type: 'buy' | 'sell';
  shares: number;
  price: number;
  notes?: string;
}

export async function POST(request: Request) {
  const supabase = createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: AddTransactionBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { fund_id, type, shares, price, notes } = body;

  // Validate
  if (!fund_id || typeof fund_id !== 'string') {
    return NextResponse.json({ error: 'fund_id is required' }, { status: 400 });
  }

  if (!['buy', 'sell'].includes(type)) {
    return NextResponse.json({ error: 'type must be buy or sell' }, { status: 400 });
  }

  const sharesNum = Number(shares);
  const priceNum = Number(price);
  if (isNaN(sharesNum) || sharesNum <= 0) {
    return NextResponse.json({ error: 'shares must be a positive number' }, { status: 400 });
  }
  if (isNaN(priceNum) || priceNum < 0) {
    return NextResponse.json({ error: 'price must be a non-negative number' }, { status: 400 });
  }

  // Get fund info from user_funds
  const { data: fund, error: fundError } = await supabase
    .from('user_funds')
    .select('fund_code, fund_name')
    .eq('id', fund_id)
    .eq('user_id', user.id)
    .single();

  if (fundError || !fund) {
    return NextResponse.json({ error: 'Fund not found' }, { status: 404 });
  }

  // Create transaction
  const { data: transaction, error: txError } = await supabase
    .from('fund_transactions')
    .insert({
      user_id: user.id,
      fund_id,
      fund_code: fund.fund_code,
      fund_name: fund.fund_name,
      transaction_type: type,
      shares: sharesNum,
      price: priceNum,
      notes: notes || null
    })
    .select()
    .single();

  if (txError) {
    console.error('Create transaction error:', txError);
    return NextResponse.json({ error: txError.message }, { status: 500 });
  }

  return NextResponse.json(transaction, { status: 201 });
}

export async function GET() {
  const supabase = createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: transactions, error } = await supabase
    .from('fund_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(transactions || []);
}
```

**Step 2: Commit**

```bash
git add src/app/api/user-funds/transactions/route.ts
git commit -m "feat: add transactions API route"
```

---

## Task 4: Update Positions API Route

**Files:**
- Modify: `src/app/api/user-funds/route.ts`

**Step 1: Replace GET with positions aggregation**

修改 GET handler：

```typescript
export async function GET() {
  const supabase = createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get all user funds with sort_order
  const { data: funds, error: fundsError } = await supabase
    .from('user_funds')
    .select('*')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (fundsError) {
    return NextResponse.json({ error: fundsError.message }, { status: 500 });
  }

  if (!funds || funds.length === 0) {
    return NextResponse.json([]);
  }

  // Get all transactions for aggregation
  const { data: transactions, error: txError } = await supabase
    .from('fund_transactions')
    .select('*')
    .eq('user_id', user.id);

  if (txError) {
    return NextResponse.json({ error: txError.message }, { status: 500 });
  }

  // Aggregate positions
  const positions = funds.map(fund => {
    const fundTx = (transactions || []).filter(t => t.fund_id === fund.id);

    const totalBuy = fundTx
      .filter(t => t.transaction_type === 'buy')
      .reduce((sum, t) => sum + (Number(t.shares) * Number(t.price)), 0);

    const totalSell = fundTx
      .filter(t => t.transaction_type === 'sell')
      .reduce((sum, t) => sum + (Number(t.shares) * Number(t.price)), 0);

    const buyShares = fundTx
      .filter(t => t.transaction_type === 'buy')
      .reduce((sum, t) => sum + Number(t.shares), 0);

    const sellShares = fundTx
      .filter(t => t.transaction_type === 'sell')
      .reduce((sum, t) => sum + Number(t.shares), 0);

    const currentShares = buyShares - sellShares;
    const avgCost = currentShares > 0 ? (totalBuy - totalSell) / currentShares : 0;

    return {
      ...fund,
      shares: currentShares,
      avg_cost: avgCost,
      total_buy: totalBuy,
      total_sell: totalSell
    };
  });

  return NextResponse.json(positions);
}
```

**Step 2: Modify POST to create transaction for initial buy**

修改 POST handler，添加首次买入时同时创建 transaction：

```typescript
export async function POST(request: Request) {
  // ... existing auth check ...

  const { fund_code, fund_name, shares: sharesInput = 0, cost: costInput = 0 } = body;
  // ... existing validation ...

  const shares = Number(sharesInput);
  const cost = Number(costInput);

  // ... existing fund_code validation ...

  // Check if fund already exists
  const { data: existingFund } = await supabase
    .from('user_funds')
    .select('id')
    .eq('user_id', user.id)
    .eq('fund_code', fund_code.trim())
    .single();

  if (existingFund) {
    return NextResponse.json(
      { error: 'Fund already exists in your portfolio', fund_id: existingFund.id },
      { status: 409 }
    );
  }

  // Get max sort_order for new fund
  const { data: maxOrder } = await supabase
    .from('user_funds')
    .select('sort_order')
    .eq('user_id', user.id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const newSortOrder = (maxOrder?.sort_order ?? -1) + 1;

  // Create fund
  const { data: newFund, error: insertError } = await supabase
    .from('user_funds')
    .insert({
      user_id: user.id,
      fund_code: fund_code.trim(),
      fund_name: fund_name || null,
      shares: 0,
      cost: 0,
      sort_order: newSortOrder
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // If initial shares > 0, create buy transaction
  if (shares > 0) {
    const { error: txError } = await supabase
      .from('fund_transactions')
      .insert({
        user_id: user.id,
        fund_id: newFund.id,
        fund_code: fund_code.trim(),
        fund_name: fund_name || null,
        transaction_type: 'buy',
        shares,
        price: cost,
        notes: 'Initial purchase'
      });

    if (txError) {
      console.error('Create initial transaction error:', txError);
    }
  }

  return NextResponse.json(newFund, { status: 201 });
}
```

**Step 3: Commit**

```bash
git add src/app/api/user-funds/route.ts
git commit -m "feat: update positions API with aggregation and initial buy"
```

---

## Task 5: Create Sort API Route

**Files:**
- Create: `src/app/api/user-funds/sort/route.ts`

**Step 1: Write PUT handler for sorting**

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface SortOrder {
  id: string;
  sort_order: number;
}

export async function PUT(request: Request) {
  const supabase = createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: SortOrder[];
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!Array.isArray(body) || body.length === 0) {
    return NextResponse.json({ error: 'orders must be a non-empty array' }, { status: 400 });
  }

  // Verify all ids belong to user
  const ids = body.map(o => o.id);
  const { data: funds, error: fetchError } = await supabase
    .from('user_funds')
    .select('id')
    .eq('user_id', user.id)
    .in('id', ids);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!funds || funds.length !== ids.length) {
    return NextResponse.json({ error: 'Some funds not found' }, { status: 404 });
  }

  // Update sort orders
  const updates = body.map(o =>
    supabase
      .from('user_funds')
      .update({ sort_order: o.sort_order })
      .eq('id', o.id)
      .eq('user_id', user.id)
  );

  const results = await Promise.all(updates);
  const error = results.find(r => r.error);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

**Step 2: Commit**

```bash
git add src/app/api/user-funds/sort/route.ts
git commit -m "feat: add sort API route for drag-and-drop ordering"
```

---

## Task 6: Create TransactionModal Component

**Files:**
- Create: `src/components/TransactionModal.tsx`

**Step 1: Write modal component**

```typescript
'use client';

import { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { Position } from '@/types';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { type: 'buy' | 'sell'; shares: number; price: number; notes?: string }) => void;
  fund: Position | null;
  currentNav?: number;
}

export default function TransactionModal({ isOpen, onClose, onSubmit, fund, currentNav }: TransactionModalProps) {
  const [type, setType] = useState<'buy' | 'sell'>('buy');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      type,
      shares: Number(shares) || 0,
      price: Number(price) || 0,
      notes: notes || undefined
    });
    setShares('');
    setPrice('');
    setNotes('');
  };

  const handleClose = () => {
    setShares('');
    setPrice('');
    setNotes('');
    onClose();
  };

  if (!fund) return null;

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/70" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-md rounded-lg bg-[#1a1a25] border border-[#2a2a3a] p-6">
          <DialogTitle className="text-lg font-semibold text-[#e0e0e0] mb-4">
            {type === 'buy' ? '加仓' : '减仓'}
          </DialogTitle>

          <div className="mb-4 p-3 bg-[#0d0d15] rounded border border-[#2a2a3a]">
            <div className="text-sm text-[#e0e0e0] font-medium">{fund.fund_name}</div>
            <div className="text-xs text-gray-500">{fund.fund_code}</div>
            <div className="text-xs text-gray-500 mt-1">当前持有: {fund.shares.toFixed(4)} 份</div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type Toggle */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType('buy')}
                className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                  type === 'buy'
                    ? 'bg-[#00ffff] text-[#0d0d15]'
                    : 'bg-[#0d0d15] border border-[#2a2a3a] text-gray-400'
                }`}
              >
                买入
              </button>
              <button
                type="button"
                onClick={() => setType('sell')}
                className={`flex-1 py-2 rounded text-sm font-medium transition-colors ${
                  type === 'sell'
                    ? 'bg-[#ff3333] text-white'
                    : 'bg-[#0d0d15] border border-[#2a2a3a] text-gray-400'
                }`}
              >
                卖出
              </button>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">份额</label>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                placeholder="0.0000"
                className="w-full px-3 py-2 bg-[#0d0d15] border border-[#2a2a3a] rounded text-[#e0e0e0] focus:border-[#00ffff] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                价格 {currentNav && `(${currentNav.toFixed(4)})`}
              </label>
              <input
                type="number"
                step="0.000001"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={currentNav ? currentNav.toString() : '0.000000'}
                className="w-full px-3 py-2 bg-[#0d0d15] border border-[#2a2a3a] rounded text-[#e0e0e0] focus:border-[#00ffff] focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">备注（可选）</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="添加备注..."
                className="w-full px-3 py-2 bg-[#0d0d15] border border-[#2a2a3a] rounded text-[#e0e0e0] focus:border-[#00ffff] focus:outline-none"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm text-gray-400 hover:text-[#e0e0e0]"
              >
                取消
              </button>
              <button
                type="submit"
                className={`px-4 py-2 text-sm font-medium rounded ${
                  type === 'buy'
                    ? 'bg-[#00ffff] text-[#0d0d15]'
                    : 'bg-[#ff3333] text-white'
                }`}
              >
                确定
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
git add src/components/TransactionModal.tsx
git commit -m "feat: add TransactionModal component for buy/sell"
```

---

## Task 7: Create PositionCard Component

**Files:**
- Create: `src/components/PositionCard.tsx`

**Step 1: Write position card component**

```typescript
'use client';

import { Position } from '@/types';
import numeral from 'numeral';
import { PencilIcon, ArrowsUpDownIcon } from '@heroicons/react/20/solid';

interface PositionCardProps {
  position: Position;
  realtimeNav?: number;
  onAddPosition: () => void;
  onViewHistory: () => void;
}

export default function PositionCard({ position, realtimeNav, onAddPosition, onViewHistory }: PositionCardProps) {
  const nav = realtimeNav || position.avg_cost;
  const currentValue = position.shares * nav;
  const totalCost = position.shares * position.avg_cost;
  const profit = currentValue - totalCost;
  const profitPercent = totalCost > 0 ? (profit / totalCost) * 100 : 0;

  return (
    <div className="bg-[#1a1a25] border border-[#2a2a3a] rounded-lg p-4 hover:border-[#00ffff] transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-medium text-[#e0e0e0]">{position.fund_name}</div>
          <div className="text-sm text-gray-500">{position.fund_code}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onViewHistory}
            className="p-2 text-gray-400 hover:text-[#00ffff] transition-colors"
            title="交易记录"
          >
            <ArrowsUpDownIcon className="w-5 h-5" />
          </button>
          <button
            onClick={onAddPosition}
            className="p-2 text-gray-400 hover:text-[#00ffff] transition-colors"
            title="加减仓"
          >
            <PencilIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-500">持有份额</div>
          <div className="text-[#e0e0e0]">{numeral(position.shares).format('0,0.0000')}</div>
        </div>
        <div>
          <div className="text-gray-500">平均成本</div>
          <div className="text-[#e0e0e0]">{numeral(position.avg_cost).format('0.000000')}</div>
        </div>
        <div>
          <div className="text-gray-500">当前净值</div>
          <div className="text-[#e0e0e0]">{numeral(nav).format('0.0000')}</div>
        </div>
        <div>
          <div className="text-gray-500">当前市值</div>
          <div className="text-[#e0e0e0]">{numeral(currentValue).format('0,0.00')}</div>
        </div>
        <div>
          <div className="text-gray-500">累计收益</div>
          <div className={`font-medium ${profit >= 0 ? 'text-[#ff3333]' : 'text-[#33ff33]'}`}>
            {profit >= 0 ? '+' : ''}{numeral(profit).format('0,0.00')}
          </div>
        </div>
        <div>
          <div className="text-gray-500">收益率</div>
          <div className={`font-medium ${profitPercent >= 0 ? 'text-[#ff3333]' : 'text-[#33ff33]'}`}>
            {profitPercent >= 0 ? '+' : ''}{numeral(profitPercent).format('0.00')}%
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/PositionCard.tsx
git commit -m "feat: add PositionCard component"
```

---

## Task 8: Update Homepage with New Components

**Files:**
- Modify: `src/app/(dashboard)/page.tsx`

**Step 1: Update imports and state**

```typescript
// Replace Position import with Position
import { Position } from '@/types';
import PositionCard from '@/components/PositionCard';
import TransactionModal from '@/components/TransactionModal';

// Replace userFunds state type
const [positions, setPositions] = useState<Position[]>([]);

// Add state for transaction modal
const [txModalOpen, setTxModalOpen] = useState(false);
const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
```

**Step 2: Update fetch logic**

```typescript
// Replace useEffect that fetches userFunds to fetch positions
useEffect(() => {
  const fetchPositions = async () => {
    try {
      const res = await axios.get('/api/user-funds');
      setPositions(res.data || []);
    } catch (e) {
      console.error('Failed to fetch positions', e);
    }
  };
  fetchPositions();
}, []);
```

**Step 3: Update add fund logic**

```typescript
const handleAddFundConfirm = async ({ shares, cost }: { shares: number; cost: number }) => {
  if (!pendingFund) return;
  try {
    await axios.post('/api/user-funds', {
      fund_code: String(pendingFund.code || ''),
      fund_name: String(pendingFund.name || ''),
      shares: Number(shares) || 0,
      cost: Number(cost) || 0
    });
    const res = await axios.get('/api/user-funds');
    setPositions(res.data || []);
  } catch (e: any) {
    console.error('Failed to add fund', e?.response?.data || e.message);
  }
  setAddModalOpen(false);
  setPendingFund(null);
};
```

**Step 4: Add transaction handlers**

```typescript
const handleAddPosition = (position: Position) => {
  setSelectedPosition(position);
  setTxModalOpen(true);
};

const handleTransactionSubmit = async (data: { type: 'buy' | 'sell'; shares: number; price: number; notes?: string }) => {
  if (!selectedPosition) return;

  try {
    await axios.post('/api/user-funds/transactions', {
      fund_id: selectedPosition.id,
      ...data
    });

    // Refresh positions
    const res = await axios.get('/api/user-funds');
    setPositions(res.data || []);
  } catch (e: any) {
    console.error('Failed to submit transaction', e?.response?.data || e.message);
  }

  setTxModalOpen(false);
  setSelectedPosition(null);
};
```

**Step 5: Update UI to use PositionCard**

```typescript
// Replace SortableItem content with PositionCard
{positions.map((position) => (
  <SortableItem key={position.id} id={position.id}>
    <PositionCard
      position={position}
      onAddPosition={() => handleAddPosition(position)}
      onViewHistory={() => {/* TODO: Navigate to history */}}
    />
  </SortableItem>
))}
```

**Step 6: Add TransactionModal**

```typescript
<TransactionModal
  isOpen={txModalOpen}
  onClose={() => {
    setTxModalOpen(false);
    setSelectedPosition(null);
  }}
  onSubmit={handleTransactionSubmit}
  fund={selectedPosition}
/>
```

**Step 7: Commit**

```bash
git add src/app/\(dashboard\)/page.tsx
git commit -m "feat: update homepage with PositionCard and TransactionModal"
```

---

## Task 9: Mark Existing Funds with Sort Order

**Files:**
- Modify: Supabase (SQL execution)

**Step 1: Execute SQL to add sort_order to existing funds**

在 Supabase SQL Editor 中执行：

```sql
-- 为现有基金添加排序字段
UPDATE public.user_funds
SET sort_order = idx
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) - 1 as idx
  FROM public.user_funds
) AS numbered
WHERE public.user_funds.id = numbered.id;

-- 验证没有 NULL 值
SELECT * FROM public.user_funds WHERE sort_order IS NULL;
```

**Step 2: Commit marker**

```bash
git commit --allow-empty -m "chore: add sort_order to existing user_funds records"
```

---

## Task 10: Apply Database Migration

**Step 1: Run migration in Supabase SQL Editor**

在 Supabase SQL Editor 中执行 `supabase/setup.sql` 中新增的 SQL。

**Step 2: Commit**

```bash
git commit --allow-empty -m "chore: apply fund_transactions table migration"
```

---

## Execution

**Plan complete and saved to `docs/plans/2026-02-14-fund-transactions-plan.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
