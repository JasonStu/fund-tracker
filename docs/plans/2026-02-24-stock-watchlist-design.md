# 自选股关注列表（Stock Watchlist）设计文档

## 概述

为 Fund Tracker 项目新增自选股关注列表功能，用户可以通过飞书编辑器录入股票信息，数据存储在 Supabase 数据库中，并在独立页面展示。

## 需求确认

- **用途**：自选股/关注列表
- **数据可见性**：所有登录用户可见
- **飞书集成**：复用现有 `/editor` 页面，提交时同时写入飞书 Bitable 和本地数据库
- **展示页面**：独立页面 `/watchlist`
- **数据来源**：程序计算字段（当前股价、价差等）实时从东方财富 API 获取

## 数据库设计

### 表结构：stock_watchlist

```sql
create table if not exists public.stock_watchlist (
  id uuid default gen_random_uuid() primary key,
  type varchar(20) not null default '情报扫描',  -- 类型：情报扫描/金股
  code varchar(20) not null,           -- 股票代码
  name text not null,                  -- 股票名称
  sector text,                          -- 板块
  price_range text,                     -- 买入区间
  strategy text,                       -- 操作策略
  first_profit_price numeric(18, 4),   -- 第一止盈位（价格）
  stop_loss_price numeric(18, 4),      -- 止损位（价格）
  position_pct text,                   -- 仓位（如 "10%"）
  highlights text,                     -- 投资亮点
  created_at timestamp with time zone default now(),  -- 提示日期
  registered_price numeric(18, 4),    -- 登记价格（写入时的当前股价）
  created_by uuid references auth.users(id)
);
```

### 类型枚举

- `情报扫描`：韩老师的股票
- `金股`：何威的股票
- `盘中重点`：郭倚双的股票

### RLS 策略

- 所有认证用户可读取
- 所有认证用户可创建/删除自己的记录

## API 设计

### 1. 获取自选股列表

**GET /api/watchlist**

返回字段：
- 所有数据库字段
- current_price：实时股价（从东方财富 API 获取）
- price_diff：价差百分比（程序计算）

```json
{
  "list": [
    {
      "id": "uuid",
      "type": "情报扫描",
      "code": "000021",
      "name": "深科技",
      "sector": "存储封测+长鑫供应商",
      "price_range": "33.20-33.50元",
      "strategy": "盘中低吸",
      "first_profit_price": 36.20,
      "stop_loss_price": 31.10,
      "position_pct": "10%",
      "highlights": "...",
      "created_at": "2026-02-24T10:00:00Z",
      "registered_price": 33.20,
      "current_price": 35.50,
      "price_diff": 6.93
    }
  ]
}
```

### 2. 新增自选股

**POST /api/watchlist**

请求体：
```json
{
  "type": "情报扫描",  // 或 "金股" / "盘中重点"
  "code": "000021",
  "name": "深科技",
  "sector": "存储封测+长鑫供应商",
  "price_range": "33.20-33.50元",
  "strategy": "盘中低吸",
  "first_profit_price": 36.20,
  "stop_loss_price": 31.10,
  "position_pct": "10%",
  "highlights": "..."
}
```

响应：返回新创建的记录（含登记价格、实时股价、价差）

### 3. 删除自选股

**DELETE /api/watchlist/[id]**

## 飞书编辑器修改

### 修改点

1. 添加类型选择器：
   - 情报扫描（韩老师的股票）
   - 金股（何威的股票）
   - 盘中重点（郭倚双的股票）

2. 添加提交目标选项：
   - 仅飞书 Bitable（现有逻辑）
   - 同时写入自选股列表（新增）

3. 提交时：
   - 解析文本获取字段
   - 调用东方财富 API 获取当前股价
   - 将数据写入 Supabase `stock_watchlist` 表（登记价格 = 当前股价）
   - 原有逻辑不变（同时写入飞书 Bitable）

### 字段映射

| 解析字段 | 数据库字段 |
|----------|------------|
| type（用户选择） | type |
| code | code |
| name | name |
| sector | sector |
| priceRange | price_range |
| strategy | strategy |
| pressure | first_profit_price（转为数值） |
| support | stop_loss_price（转为数值） |
| position | position_pct |
| highlights | highlights |

## 页面设计 /watchlist

### 布局

- 使用现有赛博朋克风格主题
- 表格形式展示，而非卡片
- 实时更新当前股价和价差

### 表格布局（每行一只股票，字段为列）

| 类型 | 股票 | 提示日期 | 登记价格 | 价差 | 板块 | 操作策略 | 当前股价 | 买入区间 | 第一止盈位 | 止损位 | 仓位 | 投资亮点 | 操作 |
|------|------|----------|----------|------|------|----------|----------|----------|------------|--------|------|----------|------|
| 情报扫描 | 翠微股份(603123) | 2026-01-06 | 15.13 | -14.02% | 多元金融+数字货币+跨境支付概念 | 短线操作，1周左右 | 13.01 | 14.9-15.1 | 20% | - | 20% | ... | 删除 |
| 金股 | 深科技(000021) | 2026-01-06 | 33.20 | +6.93% | 存储封测+长鑫供应商 | 盘中低吸 | 35.50 | 33.20-33.50 | 36.20 | 31.10 | 10% | ... | 删除 |
| 盘中重点 | 示例股票 | 2026-01-06 | 10.00 | +5.00% | 板块名称 | 操作策略 | 10.50 | 9.5-10.0 | 12.00 | 9.00 | 15% | ... | 删除 |

### 类型说明及UI颜色

| 类型 | 来源 | 标签颜色 |
|------|------|----------|
| 情报扫描 | 韩老师 | 蓝色 #00BFFF |
| 金股 | 何威 | 金色 #FFD700 |
| 盘中重点 | 郭倚双 | 红色 #FF6B6B |

### 列顺序（按UI要求）

1. 类型 - type（情报扫描/金股/盘中重点，带颜色标签）
2. 股票 - name + code
3. 提示日期 - created_at
4. 登记价格 - registered_price
5. 价差 - price_diff（涨为红色，跌为绿色）
6. 板块 - sector
7. 操作策略 - strategy
8. 当前股价 - current_price（实时）
9. 买入区间 - price_range
10. 第一止盈位 - first_profit_price
11. 止损位 - stop_loss_price
12. 仓位 - position_pct
13. 投资亮点 - highlights（表格单元格中显示，过长可截断）
14. 操作 - 关注按钮 + 删除按钮

### 功能

- 实时刷新股价（每隔 60 秒或手动刷新）
- 删除自选股
- 点击投资亮点单元格可查看完整内容
- **关注按钮**：点击后弹出首页的"添加持仓"弹窗，复用现有逻辑将该股票添加到个人持仓

## 价差计算逻辑

```typescript
// 价差 = (当前股价 - 登记价格) / 登记价格 × 100%
const priceDiff = ((currentPrice - registeredPrice) / registeredPrice) * 100;
```

- 当前股价：每次渲染时从东方财富 API 实时获取
- 登记价格：写入数据库时的当前股价

## 字段解析兼容

飞书编辑器现有的文本解析需要支持以下字段映射：

### 字段映射规则

| 飞书格式字段 | 数据库字段 | 说明 |
|--------------|------------|------|
| 股票代码+名称 | code, name | 第一行解析 |
| 相关板块 / 相关板 | sector | 板块 |
| 教学入市区间 / 入市区间 | price_range | 买入区间 |
| 操作策略 / 策略 | strategy | 操作策略 |
| 第一压力位 / 压力位 / 压力 | first_profit_price | 第一止盈位（转为数值） |
| 支撑位 / 支撑 | stop_loss_price | 止损位（转为数值） |
| 仓位 | position_pct | 仓位 |
| 投资亮点 / 亮点 | highlights | 投资亮点 |

### 特殊处理

1. **括号内容**：解析时忽略括号内的内容（如风险提示、顾问信息等）
2. **数值提取**：压力位、支撑位字段提取数值部分（去掉"元"等单位）
3. **缺失字段**：解析失败的字段存为空字符串，不影响其他字段

## 实施步骤

1. 创建数据库表 `stock_watchlist`
2. 添加 RLS 策略
3. 创建 API 路由（GET/POST/DELETE）
4. 修改飞书编辑器的文本解析器，增加字段兼容
5. 修改飞书提交逻辑，增加写入自选股功能
6. 创建 `/watchlist` 页面
7. 东方财富 API 集成（获取实时股价）

## 外部依赖

- 东方财富 API：获取实时股价（复用现有的 `/api/search` 中获取股价的逻辑）
