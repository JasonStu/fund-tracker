# 自选股价格缓存与移动端适配设计方案

## 需求概述

1. **缓存策略**：当股价 API 超时时，保留上次成功获取的价格数据，不显示 "-"
2. **刷新提示**：如果当前显示的是缓存数据（非实时），旁边显示刷新按钮
3. **自动重试**：点击刷新按钮后自动重试获取最新价格
4. **移动端适配**：使用响应式卡片布局

## 缓存策略设计

### 数据结构

```typescript
interface PriceCache {
  price: number;
  timestamp: number;  // Unix timestamp
}

// 组件内维护
const [priceCache, setPriceCache] = useState<Map<string, PriceCache>>(new Map());
```

### 逻辑流程

1. **首次加载**：发起请求
   - 成功：更新 UI + 更新缓存（记录时间戳）
   - 失败：
     - 缓存有数据 → 显示缓存 + 刷新按钮
     - 无缓存 → 显示 "-" + 刷新按钮

2. **定时刷新（60秒）**：
   - 发起请求
   - 成功：更新 UI + 隐藏刷新按钮
   - 失败：保持原缓存数据 + 显示刷新按钮（如果之前没有）

3. **点击刷新按钮**：
   - 立即发起新请求
   - 成功：更新数据 + 隐藏按钮
   - 失败：保持原样

### UI 显示

- **实时数据**：正常显示价格和价差
- **缓存数据**：显示价格 + 价差 + 刷新按钮（图标）

## 移动端响应式设计

### 断点设计

- **桌面端** (≥1024px)：当前布局
- **平板端** (768px-1023px)：减小内边距和字体
- **移动端** (<768px)：垂直堆叠布局

### 移动端卡片布局

```tsx
// 小屏幕布局
<div className="flex-col gap-2">
  {/* 第一行：股票名称 + 当前价格 */}
  <div className="flex justify-between items-center">
    <div className="flex items-center gap-2">
      <span className="type-badge">{item.type}</span>
      <span className="stock-name">{item.name}</span>
      <span className="stock-code text-xs text-gray-500">{item.code}</span>
    </div>
    <div className="text-right">
      <div className="current-price">{item.current_price || '-'}</div>
      <div className="price-diff">{item.price_diff}%</div>
    </div>
  </div>

  {/* 第二行：关键指标 */}
  <div className="grid grid-cols-3 gap-2 text-center text-sm">
    <div>登记价格</div>
    <div>当前股价</div>
    <div>价差</div>
  </div>
</div>
```

### 响应式类名

使用 Tailwind 的响应式前缀：
- `hidden md:block`：桌面端显示
- `block md:hidden`：移动端显示
- `text-sm md:text-base`：移动端稍小字体
- `p-3 md:p-4`：移动端减小内边距

## 实现文件

- `src/app/(dashboard)/watchlist/page.tsx`：主页面组件
- `src/utils/stockApi.ts`：保持不变

## 测试场景

1. 正常网络：显示实时价格，无刷新按钮
2. 断网/超时：显示上次缓存价格 + 刷新按钮
3. 首次加载失败：无价格显示 + 刷新按钮
4. 点击刷新成功：更新价格，隐藏按钮
5. 点击刷新失败：保持原样
6. 移动端查看：正确响应式布局
