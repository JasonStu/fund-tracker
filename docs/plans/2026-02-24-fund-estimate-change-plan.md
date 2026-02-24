# 首页基金模块添加估算涨幅字段

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在首页基金卡片添加"估算涨幅"字段，显示基金的实时估算涨跌幅

**Architecture:** 直接修改 FundCard 组件的数据网格布局，将"收益率"改为与"估算涨幅"并排显示

**Tech Stack:** React, Tailwind CSS, Next.js

---

### Task 1: 修改 FundCard 组件添加估算涨幅字段

**Files:**
- Modify: `src/app/(dashboard)/page.tsx:255-279` (FundCard 组件的数据网格区域)

**Step 1: 修改数据网格布局**

在 `src/app/(dashboard)/page.tsx` 文件中，找到 FundCard 组件的数据网格部分（约第 255-279 行），将：

```jsx
{/* 数据网格 */}
<div className="grid grid-cols-3 gap-3 mb-4">
  <div>
    <div className="text-xs text-gray-500">持有份额</div>
    <div className="text-sm text-[#e0e0e0]">{numeral(position.shares).format('0,0.00')}</div>
  </div>
  <div>
    <div className="text-xs text-gray-500">成本价</div>
    <div className="text-sm text-[#e0e0e0]">{numeral(position.avg_cost).format('0.0000')}</div>
  </div>
  <div>
    <div className="text-xs text-gray-500">当前净值</div>
    <div className="text-sm text-[#e0e0e0]">{numeral(nav).format('0.0000')}</div>
  </div>
  <div>
    <div className="text-xs text-gray-500">持仓市值</div>
    <div className="text-sm text-[#00ffff]">{numeral(currentValue).format('0,0.00')}</div>
  </div>
  <div className="col-span-2">
    <div className="text-xs text-gray-500">收益率</div>
    <div className={`text-lg font-semibold ${profitPercent >= 0 ? 'text-[#00ffff]' : 'text-[#ff3333]'}`}>
      {profitPercent >= 0 ? '+' : ''}{numeral(profitPercent).format('0.00')}%
    </div>
  </div>
</div>
```

修改为：

```jsx
{/* 数据网格 */}
<div className="grid grid-cols-3 gap-3 mb-4">
  <div>
    <div className="text-xs text-gray-500">持有份额</div>
    <div className="text-sm text-[#e0e0e0]">{numeral(position.shares).format('0,0.00')}</div>
  </div>
  <div>
    <div className="text-xs text-gray-500">成本价</div>
    <div className="text-sm text-[#e0e0e0]">{numeral(position.avg_cost).format('0.0000')}</div>
  </div>
  <div>
    <div className="text-xs text-gray-500">当前净值</div>
    <div className="text-sm text-[#e0e0e0]">{numeral(nav).format('0.0000')}</div>
  </div>
  <div>
    <div className="text-xs text-gray-500">持仓市值</div>
    <div className="text-sm text-[#00ffff]">{numeral(currentValue).format('0,0.00')}</div>
  </div>
  <div>
    <div className="text-xs text-gray-500">收益率</div>
    <div className={`text-lg font-semibold ${profitPercent >= 0 ? 'text-[#00ffff]' : 'text-[#ff3333]'}`}>
      {profitPercent >= 0 ? '+' : ''}{numeral(profitPercent).format('0.00')}%
    </div>
  </div>
  <div>
    <div className="text-xs text-gray-500">估算涨幅</div>
    <div className={`text-lg font-semibold ${position.estimatedChangePercent >= 0 ? 'text-[#ff3333]' : 'text-[#33ff33]'}`}>
      {position.estimatedChangePercent >= 0 ? '+' : ''}{numeral(position.estimatedChangePercent).format('0.00')}%
    </div>
  </div>
</div>
```

**Step 2: 验证修改**

运行开发服务器验证：

```bash
npm run dev
```

访问 http://localhost:3000，确认：
1. 基金卡片显示"估算涨幅"字段
2. 涨幅颜色正确（涨红色 `#ff3333`，跌绿色 `#33ff33`）
3. 格式正确（带正负号和百分号）
4. 布局整齐，与其他字段对齐

**Step 3: 提交代码**

```bash
git add src/app/\(dashboard\)/page.tsx
git commit -m "feat: add estimated change to fund card"
```
