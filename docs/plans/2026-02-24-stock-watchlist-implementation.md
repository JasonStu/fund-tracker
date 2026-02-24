# 自选股关注列表 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 Fund Tracker 添加自选股关注列表功能，用户可通过飞书编辑器录入，数据存储在 Supabase，并在独立页面展示

**Architecture:** 复用现有飞书编辑器，提交时同时写入本地数据库；独立页面 `/watchlist` 展示表格数据，实时从东方财富 API 获取股价

**Tech Stack:** Next.js 16, Supabase, 东方财富 API, Tailwind CSS

---

## Task 1: 创建数据库表 stock_watchlist

**Files:**
- Modify: `supabase/migrations/003_create_stock_watchlist.sql` (create new migration file)

**Step 1: 创建迁移文件**

```sql
-- supabase/migrations/003_create_stock_watchlist.sql

-- 创建 stock_watchlist 表
create table if not exists public.stock_watchlist (
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
```

**Step 2: 执行迁移**

在 Supabase SQL Editor 中运行迁移文件

**Step 3: Commit**

```bash
git add supabase/migrations/003_create_stock_watchlist.sql
git commit -m "feat: 创建 stock_watchlist 数据库表"
```

---

## Task 2: 创建 GET /api/watchlist API

**Files:**
- Create: `src/app/api/watchlist/route.ts`

**Step 1: 编写 API 路由**

```typescript
// src/app/api/watchlist/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET() {
  const supabase = createClient();

  const { data: stocks, error } = await supabase
    .from('stock_watchlist')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ list: stocks });
}
```

**Step 2: Commit**

```bash
git add src/app/api/watchlist/route.ts
git commit -m "feat: 添加 GET /api/watchlist 接口"
```

---

## Task 3: 创建 POST /api/watchlist API

**Files:**
- Modify: `src/app/api/watchlist/route.ts`

**Step 1: 添加 POST 处理器**

```typescript
// 在 src/app/api/watchlist/route.ts 中添加
import { getStockPrice } from '@/utils/stockApi';

export async function POST(request: Request) {
  const supabase = createClient();

  // 获取当前用户
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { type, code, name, sector, price_range, strategy, first_profit_price, stop_loss_price, position_pct, highlights } = body;

  // 获取当前股价作为登记价格
  const currentPrice = await getStockPrice(code);

  const { data, error } = await supabase
    .from('stock_watchlist')
    .insert({
      type: type || '情报扫描',
      code,
      name,
      sector,
      price_range,
      strategy,
      first_profit_price,
      stop_loss_price,
      position_pct,
      highlights,
      registered_price: currentPrice,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
```

**Step 2: 创建股票价格获取工具函数**

```typescript
// src/utils/stockApi.ts
export async function getStockPrice(code: string): Promise<number> {
  try {
    const response = await fetch(
      `https://push2.eastmoney.com/api/qt/stock/get?secid=${getSecId(code)}&fields=f43,f44,f45,f46,f47,f48,f49,f50,f51,f52,f57,f58,f59,f60,f169,f170,f171`
    );
    const data = await response.json();
    return data.data?.f43 ? data.data.f43 / 100 : 0;
  } catch (error) {
    console.error('Failed to get stock price:', error);
    return 0;
  }
}

function getSecId(code: string): string {
  // 沪市: 1.0, 深市: 0.0, 创业板: 0.3, 科创板: 1.688
  if (code.startsWith('6') || code.startsWith('5') || code.startsWith('688')) {
    return `1.${code}`;
  }
  return `0.${code}`;
}
```

**Step 3: Commit**

```bash
git add src/app/api/watchlist/route.ts src/utils/stockApi.ts
git commit -m "feat: 添加 POST /api/watchlist 接口和股票价格获取工具"
```

---

## Task 4: 创建 DELETE /api/watchlist/[id] API

**Files:**
- Create: `src/app/api/watchlist/[id]/route.ts`

**Step 1: 编写 DELETE API**

```typescript
// src/app/api/watchlist/[id]/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const { error } = await supabase
    .from('stock_watchlist')
    .delete()
    .eq('id', id)
    .eq('created_by', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

**Step 2: Commit**

```bash
git add src/app/api/watchlist/[id]/route.ts
git commit -m "feat: 添加 DELETE /api/watchlist/[id] 接口"
```

---

## Task 5: 创建 /watchlist 页面

**Files:**
- Create: `src/app/(dashboard)/watchlist/page.tsx`

**Step 1: 创建页面组件**

```tsx
// src/app/(dashboard)/watchlist/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import { useTranslations } from 'next-intl';
import numeral from 'numeral';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import AddPositionModal from '@/components/AddPositionModal';
import { Position, InvestmentType } from '@/types';

interface WatchlistItem {
  id: string;
  type: '情报扫描' | '金股' | '盘中重点';
  code: string;
  name: string;
  sector: string;
  price_range: string;
  strategy: string;
  first_profit_price: number;
  stop_loss_price: number;
  position_pct: string;
  highlights: string;
  created_at: string;
  registered_price: number;
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  '情报扫描': { bg: 'bg-[#00BFFF]/20', text: 'text-[#00BFFF]' },
  '金股': { bg: 'bg-[#FFD700]/20', text: 'text-[#FFD700]' },
  '盘中重点': { bg: 'bg-[#FF6B6B]/20', text: 'text-[#FF6B6B]' },
};

export default function WatchlistPage() {
  const t = useTranslations('Watchlist');
  const [list, setList] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<{ code: string; name: string } | null>(null);

  const fetchList = async () => {
    try {
      const res = await apiClient.get<{ list: WatchlistItem[] }>('/watchlist');
      setList(res.data?.list || []);
    } catch (e) {
      console.error('Failed to fetch watchlist', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除吗？')) return;
    try {
      await apiClient.delete(`/watchlist/${id}`);
      fetchList();
    } catch (e) {
      console.error('Failed to delete', e);
    }
  };

  const handleAddToPortfolio = (item: WatchlistItem) => {
    setSelectedStock({ code: item.code, name: item.name });
    setAddModalOpen(true);
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-[#e0e0e0] mb-6">自选股关注列表</h1>

      {loading ? (
        <LoadingSpinner />
      ) : list.length === 0 ? (
        <div className="text-center text-gray-500 py-12">暂无数据</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a3a]">
                <th className="text-left py-3 px-2 text-gray-400">类型</th>
                <th className="text-left py-3 px-2 text-gray-400">股票</th>
                <th className="text-left py-3 px-2 text-gray-400">提示日期</th>
                <th className="text-left py-3 px-2 text-gray-400">登记价格</th>
                <th className="text-left py-3 px-2 text-gray-400">价差</th>
                <th className="text-left py-3 px-2 text-gray-400">板块</th>
                <th className="text-left py-3 px-2 text-gray-400">操作策略</th>
                <th className="text-left py-3 px-2 text-gray-400">当前股价</th>
                <th className="text-left py-3 px-2 text-gray-400">买入区间</th>
                <th className="text-left py-3 px-2 text-gray-400">第一止盈位</th>
                <th className="text-left py-3 px-2 text-gray-400">止损位</th>
                <th className="text-left py-3 px-2 text-gray-400">仓位</th>
                <th className="text-left py-3 px-2 text-gray-400">投资亮点</th>
                <th className="text-left py-3 px-2 text-gray-400">操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item) => (
                <tr key={item.id} className="border-b border-[#2a2a3a] hover:bg-[#1a1a25]">
                  <td className="py-3 px-2">
                    <span className={`px-2 py-1 rounded text-xs ${TYPE_COLORS[item.type]?.bg} ${TYPE_COLORS[item.type]?.text}`}>
                      {item.type}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-[#e0e0e0]">{item.name}({item.code})</td>
                  <td className="py-3 px-2 text-gray-400">{new Date(item.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-2 text-gray-300">{numeral(item.registered_price).format('0.00')}</td>
                  <td className="py-3 px-2">-</td>
                  <td className="py-3 px-2 text-gray-400 max-w-[150px] truncate">{item.sector}</td>
                  <td className="py-3 px-2 text-gray-400">{item.strategy}</td>
                  <td className="py-3 px-2 text-gray-300">-</td>
                  <td className="py-3 px-2 text-gray-400">{item.price_range}</td>
                  <td className="py-3 px-2 text-gray-300">{item.first_profit_price || '-'}</td>
                  <td className="py-3 px-2 text-gray-300">{item.stop_loss_price || '-'}</td>
                  <td className="py-3 px-2 text-gray-400">{item.position_pct}</td>
                  <td className="py-3 px-2 text-gray-400 max-w-[200px] truncate" title={item.highlights}>
                    {item.highlights}
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleAddToPortfolio(item)}
                        className="px-2 py-1 text-xs bg-[#00ffff]/20 text-[#00ffff] hover:bg-[#00ffff]/30 rounded"
                      >
                        关注
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="px-2 py-1 text-xs bg-[#ff3333]/20 text-[#ff3333] hover:bg-[#ff3333]/30 rounded"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddPositionModal
        isOpen={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setSelectedStock(null);
        }}
        onSubmit={async ({ shares, cost }) => {
          if (!selectedStock) return;
          await apiClient.post('/user-funds', {
            type: 'stock',
            code: selectedStock.code,
            name: selectedStock.name,
            shares,
            cost,
          });
          setAddModalOpen(false);
          setSelectedStock(null);
        }}
        result={selectedStock ? { code: selectedStock.code, name: selectedStock.name, type: 'stock' as InvestmentType } : null}
        loading={false}
      />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/(dashboard)/watchlist/page.tsx
git commit -m "feat: 添加 /watchlist 自选股列表页面"
```

---

## Task 6: 修改飞书编辑器添加自选股功能

**Files:**
- Modify: `src/app/(dashboard)/editor/page.tsx`
- Modify: `src/utils/textParser.ts`

**Step 1: 修改文本解析器支持类型字段**

```typescript
// src/utils/textParser.ts 添加
export interface ParsedStock {
  type: '情报扫描' | '金股' | '盘中重点';  // 新增
  // ... 现有字段
}

export function parseStockInfo(text: string): ParsedStock {
  const result: ParsedStock = {
    type: '情报扫描',  // 默认值
    // ... 现有初始化
  };

  // 解析第一行时尝试提取类型
  // 如果包含"金股"则 type = '金股'
  // 如果包含"盘中重点"则 type = '盘中重点'
  // 否则默认 '情报扫描'

  return result;
}
```

**Step 2: 修改编辑器页面添加类型选择器和提交选项**

```tsx
// src/app/(dashboard)/editor/page.tsx 修改

// 添加状态
const [stockType, setStockType] = useState<'情报扫描' | '金股' | '盘中重点'>('情报扫描');
const [submitTarget, setSubmitTarget] = useState<'feishu' | 'both'>('both');

// 修改提交逻辑
const handleSubmit = async () => {
  if (!parsedStock) return;

  setIsLoading(true);
  setError(null);
  setSuccess(null);

  try {
    // 如果需要写入自选股
    if (submitTarget === 'both') {
      const watchlistRes = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: stockType,
          code: parsedStock.code,
          name: parsedStock.name,
          sector: parsedStock.sector,
          price_range: parsedStock.priceRange,
          strategy: parsedStock.strategy,
          first_profit_price: parseFloat(parsedStock.pressure) || null,
          stop_loss_price: parseFloat(parsedStock.support) || null,
          position_pct: parsedStock.position,
          highlights: parsedStock.highlights,
        }),
      });

      if (!watchlistRes.ok) {
        throw new Error('Failed to add to watchlist');
      }
    }

    // 原有飞书逻辑
    const response = await fetch('/api/feishu/bitable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'insert',
        stock: parsedStock,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || t('error.submitFailed'));
    }

    setSuccess(t('success.submitted', { code: parsedStock.code }));
    setParsedStock(null);
    setInputText('');
  } catch (err) {
    const message = err instanceof Error ? err.message : t('error.unknown');
    setError(message);
  } finally {
    setIsLoading(false);
  }
};
```

**Step 3: 在编辑器UI中添加类型选择器**

```tsx
// 在解析按钮旁边添加
<div className="flex gap-2 mb-3">
  <select
    value={stockType}
    onChange={(e) => setStockType(e.target.value as any)}
    className="bg-[#12121a] border border-[#2a2a3a] text-gray-200 px-3 py-2 rounded"
  >
    <option value="情报扫描">情报扫描</option>
    <option value="金股">金股</option>
    <option value="盘中重点">盘中重点</option>
  </select>

  <select
    value={submitTarget}
    onChange={(e) => setSubmitTarget(e.target.value as any)}
    className="bg-[#12121a] border border-[#2a2a3a] text-gray-200 px-3 py-2 rounded"
  >
    <option value="both">同时写入自选股 + 飞书</option>
    <option value="feishu">仅飞书</option>
  </select>
</div>
```

**Step 4: Commit**

```bash
git add src/app/(dashboard)/editor/page.tsx src/utils/textParser.ts
git commit -m "feat: 飞书编辑器添加自选股功能"
```

---

## Task 7: 添加实时股价和价差计算

**Files:**
- Modify: `src/app/(dashboard)/watchlist/page.tsx`

**Step 1: 添加东方财富 API 获取股价**

```tsx
// 在 WatchlistPage 中添加
useEffect(() => {
  const fetchPrices = async () => {
    const updatedList = await Promise.all(
      list.map(async (item) => {
        try {
          const price = await getStockPrice(item.code);
          const priceDiff = item.registered_price
            ? ((price - item.registered_price) / item.registered_price) * 100
            : 0;
          return { ...item, current_price: price, price_diff: priceDiff };
        } catch {
          return { ...item, current_price: 0, price_diff: 0 };
        }
      })
    );
    setList(updatedList);
  };

  fetchPrices();
  const interval = setInterval(fetchPrices, 60000); // 每60秒刷新

  return () => clearInterval(interval);
}, [list.length]);
```

**Step 2: 更新表格渲染当前股价和价差**

```tsx
// 价差单元格
<td className={`py-3 px-2 font-medium ${
  item.price_diff >= 0 ? 'text-[#ff3333]' : 'text-[#33ff33]'
}`}>
  {item.price_diff >= 0 ? '+' : ''}{numeral(item.price_diff).format('0.00')}%
</td>

// 当前股价单元格
<td className="py-3 px-2 text-gray-300">
  {numeral(item.current_price).format('0.00')}
</td>
```

**Step 3: Commit**

```bash
git add src/app/(dashboard)/watchlist/page.tsx
git commit -m "feat: 添加实时股价和价差计算"
```

---

## Task 8: 添加国际化文本

**Files:**
- Modify: `messages/zh.json` 和 `messages/en.json`

**Step 1: 添加中文翻译**

```json
{
  "Watchlist": {
    "title": "自选股关注列表",
    "empty": "暂无数据",
    "confirmDelete": "确定要删除吗？"
  }
}
```

**Step 2: Commit**

```bash
git add messages/zh.json
git commit -m "feat: 添加自选股页面国际化文本"
```

---

## Plan Complete

**Plan complete and saved to `docs/plans/2026-02-24-stock-watchlist-implementation.md`**

---

**Two execution options:**

1. **Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

2. **Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
