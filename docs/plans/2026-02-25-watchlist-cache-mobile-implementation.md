# 自选股价格缓存与移动端适配实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 为自选股页面添加价格缓存策略（超时保留上次数据+刷新按钮）和移动端响应式布局

**Architecture:** 在 watchlist/page.tsx 组件内维护价格缓存 Map，在获取价格时实现降级策略：API 失败时从缓存读取，并标记 `isStale` 状态用于显示刷新按钮。移动端使用 Tailwind 响应式类实现卡片布局适配。

**Tech Stack:** React useState, useEffect, Map, Tailwind CSS responsive

---

### Task 1: 添加价格缓存状态

**Files:**
- Modify: `src/app/(dashboard)/watchlist/page.tsx`

**Step 1: 添加缓存状态**

在组件内添加 priceCache 状态：

```tsx
// 在现有状态后添加
const [priceCache, setPriceCache] = useState<Map<string, { price: number; timestamp: number }>>(new Map());
const [refreshingStocks, setRefreshingStocks] = useState<Set<string>>(new Set());
```

**Step 2: Commit**

---

### Task 2: 修改价格获取逻辑

**Files:**
- Modify: `src/app/(dashboard)/watchlist/page.tsx`

**Step 1: 更新 useEffect 中的 fetchPrices 函数**

```tsx
const fetchPrices = async (isManualRefresh = false, stockCode?: string) => {
  const stocksToFetch = stockCode ? [list.find(item => item.code === stockCode)].filter(Boolean) : list;

  // 使用 Promise.allSettled 确保即使某个股票获取失败也不影响其他股票
  const results = await Promise.allSettled(
    stocksToFetch.map(async (item) => {
      try {
        const price = await getStockPrice(item!.code);
        // 只有获取到有效价格时才更新
        if (price !== null && item!.registered_price) {
          const priceDiff = ((price - item!.registered_price) / item!.registered_price) * 100;
          // 更新缓存
          setPriceCache(prev => new Map(prev).set(item!.code, { price, timestamp: Date.now() }));
          return { ...item!, current_price: price, price_diff: priceDiff, isStale: false };
        }
        // 如果价格获取失败，检查缓存
        const cached = priceCache.get(item!.code);
        if (cached && item!.registered_price) {
          const priceDiff = ((cached.price - item!.registered_price) / item!.registered_price) * 100;
          return { ...item!, current_price: cached.price, price_diff: priceDiff, isStale: true };
        }
        // 无缓存，保持原值
        return { ...item!, isStale: true };
      } catch (error) {
        console.error(`Fetch price failed for ${item!.code}:`, error);
        // 检查缓存
        const cached = priceCache.get(item!.code);
        if (cached && item!.registered_price) {
          const priceDiff = ((cached.price - item!.registered_price) / item!.registered_price) * 100;
          return { ...item!, current_price: cached.price, price_diff: priceDiff, isStale: true };
        }
        return { ...item!, isStale: true };
      }
    })
  );

  // 提取成功的结果
  const updatedList = results
    .filter((result): result is PromiseFulfilledResult<WatchlistItem & { isStale?: boolean }> => result.status === 'fulfilled')
    .map(result => result.value);

  if (stockCode) {
    // 单个刷新，更新对应项
    setList(prev => prev.map(item => {
      const updated = updatedList.find(u => u.code === item.code);
      return updated || item;
    }));
    setRefreshingStocks(prev => {
      const next = new Set(prev);
      next.delete(stockCode);
      return next;
    });
  } else {
    setList(updatedList);
  }
};
```

**Step 2: 修改依赖数组**

```tsx
}, [list.length, priceCache]); // 添加 priceCache 依赖
```

**Step 3: Commit**

---

### Task 3: 添加刷新按钮 UI

**Files:**
- Modify: `src/app/(dashboard)/watchlist/page.tsx`

**Step 1: 在"当前股价"显示区域添加刷新按钮**

找到第 201-206 行，修改当前股价显示：

```tsx
<div>
  <div className="text-xs text-gray-500">当前股价</div>
  <div className="flex items-center gap-1">
    <div className="text-[#FFD700] font-mono font-medium">
      {item.current_price ? numeral(item.current_price).format('0.00') : '-'}
    </div>
    {item.isStale && (
      <button
        onClick={(e) => {
          e.stopPropagation();
          setRefreshingStocks(prev => new Set(prev).add(item.code));
          fetchPrices(true, item.code);
        }}
        disabled={refreshingStocks.has(item.code)}
        className="p-1 text-gray-500 hover:text-[#FFD700] transition-colors"
        title="刷新价格"
      >
        <svg className={`w-3 h-3 ${refreshingStocks.has(item.code) ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    )}
  </div>
</div>
```

**Step 2: Commit**

---

### Task 4: 添加移动端响应式布局

**Files:**
- Modify: `src/app/(dashboard)/watchlist/page.tsx`

**Step 1: 修改主卡片布局**

将第 177-244 行的主行区域改为响应式布局：

```tsx
{/* Main Row - Responsive */}
<div className="p-4">
  {/* 桌面端：水平布局 */}
  <div className="hidden md:flex items-center justify-between gap-4">
    {/* Left: Type + Stock */}
    <div className="flex items-center gap-3 min-w-0">
      <span className={`px-2.5 py-1 rounded text-xs font-medium border ${TYPE_COLORS[item.type]?.bg} ${TYPE_COLORS[item.type]?.text} ${TYPE_COLORS[item.type]?.border}`}>
        {item.type}
      </span>
      <div className="min-w-0">
        <div className="text-[#e0e0e0] font-medium truncate">{item.name}</div>
        <div className="text-xs text-gray-500">{item.code}</div>
      </div>
    </div>

    {/* Center: Key Metrics */}
    <div className="flex-1 flex items-center justify-around gap-4 text-center">
      <div>
        <div className="text-xs text-gray-500">登记价格</div>
        <div className="text-gray-300 font-mono">{numeral(item.registered_price).format('0.00')}</div>
      </div>
      <div>
        <div className="text-xs text-gray-500">当前股价</div>
        {/* 刷新按钮代码 */}
        <div className="flex items-center justify-center gap-1">
          <div className="text-[#FFD700] font-mono font-medium">
            {item.current_price ? numeral(item.current_price).format('0.00') : '-'}
          </div>
          {item.isStale && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setRefreshingStocks(prev => new Set(prev).add(item.code));
                fetchPrices(true, item.code);
              }}
              disabled={refreshingStocks.has(item.code)}
              className="p-1 text-gray-500 hover:text-[#FFD700] transition-colors"
              title="刷新价格"
            >
              <svg className={`w-3 h-3 ${refreshingStocks.has(item.code) ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>
      </div>
      <div>
        <div className="text-xs text-gray-500">价差</div>
        <div className={`font-mono font-medium ${
          (item.price_diff || 0) >= 0 ? 'text-[#ff3333]' : 'text-[#33ff33]'
        }`}>
          {item.price_diff ? (item.price_diff >= 0 ? '+' : '') + numeral(item.price_diff).format('0.00') + '%' : '-'}
        </div>
      </div>
    </div>

    {/* Right: Actions */}
    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={() => handleEdit(item)}
        className="px-3 py-1.5 text-xs bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] hover:bg-[#FFD700]/20 hover:border-[#FFD700]/50 rounded transition-colors"
      >
        编辑
      </button>
      <button
        onClick={() => handleAddToPortfolio(item)}
        className="px-3 py-1.5 text-xs bg-[#00ffff]/10 border border-[#00ffff]/30 text-[#00ffff] hover:bg-[#00ffff]/20 hover:border-[#00ffff]/50 rounded transition-colors"
      >
        关注
      </button>
      <button
        onClick={() => handleDelete(item.id, item.name)}
        className="px-3 py-1.5 text-xs bg-[#ff3333]/10 border border-[#ff3333]/30 text-[#ff3333] hover:bg-[#ff3333]/20 hover:border-[#ff3333]/50 rounded transition-colors"
      >
        删除
      </button>
      <button
        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
        className="px-3 py-1.5 text-xs text-gray-400 hover:text-[#FFD700] transition-colors"
      >
        {expandedId === item.id ? '收起' : '详情'}
      </button>
    </div>
  </div>

  {/* 移动端：垂直布局 */}
  <div className="md:hidden flex flex-col gap-3">
    {/* 第一行：股票信息 + 价格 */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 min-w-0">
        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${TYPE_COLORS[item.type]?.bg} ${TYPE_COLORS[item.type]?.text} ${TYPE_COLORS[item.type]?.border}`}>
          {item.type}
        </span>
        <div className="min-w-0">
          <div className="text-[#e0e0e0] font-medium text-sm truncate">{item.name}</div>
          <div className="text-xs text-gray-500">{item.code}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="flex items-center gap-1 justify-end">
          <span className="text-[#FFD700] font-mono font-medium text-sm">
            {item.current_price ? numeral(item.current_price).format('0.00') : '-'}
          </span>
          {item.isStale && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setRefreshingStocks(prev => new Set(prev).add(item.code));
                fetchPrices(true, item.code);
              }}
              disabled={refreshingStocks.has(item.code)}
              className="p-1 text-gray-500 hover:text-[#FFD700] transition-colors"
            >
              <svg className={`w-3 h-3 ${refreshingStocks.has(item.code) ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>
        <div className={`text-xs font-mono ${
          (item.price_diff || 0) >= 0 ? 'text-[#ff3333]' : 'text-[#33ff33]'
        }`}>
          {item.price_diff ? (item.price_diff >= 0 ? '+' : '') + numeral(item.price_diff).format('0.00') + '%' : '-'}
        </div>
      </div>
    </div>

    {/* 第二行：指标网格 */}
    <div className="grid grid-cols-3 gap-2 text-center bg-[#1a1a25] rounded p-2">
      <div>
        <div className="text-xs text-gray-500">登记价</div>
        <div className="text-gray-300 font-mono text-sm">{numeral(item.registered_price).format('0.00')}</div>
      </div>
      <div>
        <div className="text-xs text-gray-500">当前价</div>
        <div className="text-[#FFD700] font-mono text-sm">{item.current_price ? numeral(item.current_price).format('0.00') : '-'}</div>
      </div>
      <div>
        <div className="text-xs text-gray-500">价差</div>
        <div className={`font-mono text-sm ${(item.price_diff || 0) >= 0 ? 'text-[#ff3333]' : 'text-[#33ff33]'}`}>
          {item.price_diff ? (item.price_diff >= 0 ? '+' : '') + numeral(item.price_diff).format('0.00') + '%' : '-'}
        </div>
      </div>
    </div>

    {/* 第三行：操作按钮 */}
    <div className="flex gap-2">
      <button
        onClick={() => handleEdit(item)}
        className="flex-1 px-2 py-1.5 text-xs bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] rounded transition-colors"
      >
        编辑
      </button>
      <button
        onClick={() => handleAddToPortfolio(item)}
        className="flex-1 px-2 py-1.5 text-xs bg-[#00ffff]/10 border border-[#00ffff]/30 text-[#00ffff] rounded transition-colors"
      >
        关注
      </button>
      <button
        onClick={() => handleDelete(item.id, item.name)}
        className="flex-1 px-2 py-1.5 text-xs bg-[#ff3333]/10 border border-[#ff3333]/30 text-[#ff3333] rounded transition-colors"
      >
        删除
      </button>
    </div>
  </div>
</div>
```

**Step 2: 移动端 Secondary Info 也做响应式**

修改第 246-272 行：

```tsx
{/* Secondary Info - Responsive */}
<div className="mt-3 pt-3 border-t border-[#2a2a3a]">
  {/* 桌面端 */}
  <div className="hidden md:flex flex-wrap gap-x-6 gap-y-2 text-sm">
    <div>
      <span className="text-gray-500">板块：</span>
      <span className="text-gray-400">{item.sector || '-'}</span>
    </div>
    <div>
      <span className="text-gray-500">策略：</span>
      <span className="text-gray-400">{item.strategy || '-'}</span>
    </div>
    <div>
      <span className="text-gray-500">买入区间：</span>
      <span className="text-gray-400">{item.price_range || '-'}</span>
    </div>
    <div>
      <span className="text-gray-500">止盈位：</span>
      <span className="text-[#ff3333]">{item.first_profit_price || '-'}</span>
    </div>
    <div>
      <span className="text-gray-500">止损位：</span>
      <span className="text-[#33ff33]">{item.stop_loss_price || '-'}</span>
    </div>
    <div>
      <span className="text-gray-500">仓位：</span>
      <span className="text-gray-400">{item.position_pct || '-'}</span>
    </div>
  </div>

  {/* 移动端：两列布局 */}
  <div className="md:hidden grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
    <div>
      <span className="text-gray-500">板块：</span>
      <span className="text-gray-400">{item.sector || '-'}</span>
    </div>
    <div>
      <span className="text-gray-500">策略：</span>
      <span className="text-gray-400">{item.strategy || '-'}</span>
    </div>
    <div>
      <span className="text-gray-500">买入区间：</span>
      <span className="text-gray-400">{item.price_range || '-'}</span>
    </div>
    <div>
      <span className="text-gray-500">止盈位：</span>
      <span className="text-[#ff3333]">{item.first_profit_price || '-'}</span>
    </div>
    <div>
      <span className="text-gray-500">止损位：</span>
      <span className="text-[#33ff33]">{item.stop_loss_price || '-'}</span>
    </div>
    <div>
      <span className="text-gray-500">仓位：</span>
      <span className="text-gray-400">{item.position_pct || '-'}</span>
    </div>
  </div>
</div>
```

**Step 3: Commit**

---

### Task 5: 测试与验证

**Files:**
- Modify: `TEST_CASES.md`

**Step 1: 添加测试案例**

在 TEST_CASES.md 中添加：

```markdown
### 2026-02-25 自选股价格缓存与移动端适配

#### 缓存策略测试
- [ ] 正常网络：显示实时价格，无刷新按钮
- [ ] 断网/超时：显示上次缓存价格 + 刷新按钮
- [ ] 首次加载失败：无价格显示 + 刷新按钮
- [ ] 点击刷新成功：更新价格，隐藏按钮
- [ ] 点击刷新失败：保持原样

#### 移动端响应式测试
- [ ] 移动端 (<768px)：垂直堆叠布局正确显示
- [ ] 平板端 (768px-1023px)：自适应布局
- [ ] 桌面端 (≥1024px)：原有水平布局
```

**Step 2: 运行验证**

```bash
npm run lint
```

**Step 3: Commit**

---

## 执行方式

**Plan complete and saved to `docs/plans/2026-02-25-watchlist-cache-mobile-design.md`. Two execution options:**

1. **Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

2. **Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
