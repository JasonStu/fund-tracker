# 基金持仓与交易记录设计

## 背景

当前用户基金存储已迁移到 Supabase，但需要支持：
1. 完整的加减仓交易记录
2. 数据库存储的排序功能
3. 前端已存在检查 + API 校验

## 目标

- 支持分批买入/卖出，记录完整交易历史
- 支持数据库存储的用户自定义排序
- 前端提示已添加基金 + API 双重校验

## 数据库设计

### 新建 `fund_transactions` 表

```sql
create table public.fund_transactions (
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

alter table public.fund_transactions enable row level security;

create policy "Users can manage own transactions"
  on public.fund_transactions for all
  using (auth.uid() = user_id);
```

### 修改 `user_funds` 表

```sql
alter table public.user_funds add column if not exists sort_order integer;
```

### 表结构说明

**fund_transactions 表**：

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| user_id | uuid | 关联 auth.users |
| fund_code | varchar(20) | 基金代码 |
| fund_name | text | 基金名称 |
| transaction_type | varchar(10) | buy/sell |
| shares | numeric(18,4) | 交易份额 |
| price | numeric(18,6) | 交易单价 |
| notes | text | 备注 |
| created_at | timestamptz | 创建时间 |

**user_funds 表新增**：

| 字段 | 类型 | 说明 |
|------|------|------|
| sort_order | integer | 排序权重（越小越靠前） |

## API 设计

### 基础路径

`/api/user-funds`

### 接口列表

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/user-funds/positions` | 获取所有持仓（聚合计算当前份额和成本） |
| POST | `/api/user-funds/positions` | 添加持仓（首次买入，同时创建 transaction） |
| POST | `/api/user-funds/transactions` | 记录加仓/减仓 |
| PUT | `/api/user-funds/sort` | 更新排序 |
| PUT | `/api/user-funds/positions/[id]` | 更新基金信息 |

### 持仓聚合计算

```sql
-- 当前持有份额 = SUM(buy.shares) - SUM(sell.shares)
-- 平均成本 = (总买入金额 - 总卖出金额) / 当前持有份额
```

### 响应格式

```typescript
interface Position {
  id: string;              // user_funds id
  fund_code: string;
  fund_name: string;
  sort_order: number;
  shares: number;          // 当前持有份额
  avg_cost: number;        // 平均成本价
  total_buy: number;       // 总买入金额
  total_sell: number;      // 总卖出金额
  created_at: string;
}

interface Transaction {
  id: string;
  fund_id: string;         // user_funds id
  fund_code: string;
  fund_name: string;
  transaction_type: 'buy' | 'sell';
  shares: number;
  price: number;
  notes?: string;
  created_at: string;
}
```

## 前端改动

### 组件结构

```
src/app/(dashboard)/
├── page.tsx                    # 持仓列表
└── fund/
    └── [code]/                 # 基金详情（已有）
        └── transactions/       # 交易记录（新增）

src/components/
├── PositionList.tsx           # 持仓列表组件
├── PositionCard.tsx           # 持仓卡片组件
├── TransactionModal.tsx       # 加减仓弹窗
└── TransactionHistory.tsx     # 交易记录列表
```

### 持仓列表页面

- 按 sort_order 排序显示
- 每条显示：基金名称、持有份额、均价、市值、收益
- 支持拖拽排序
- 点击打开加减仓弹窗

### 搜索基金

- 搜索结果标记"已添加"
- 已添加的基金不可选择，点击提示已存在

### 加减仓弹窗

```typescript
interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TransactionData) => void;
  fund: Position;
  currentNav?: number;
}

interface TransactionData {
  type: 'buy' | 'sell';
  shares: number;
  price: number;
  notes?: string;
}
```

## 数据流程

### 添加基金（首次）

```
用户搜索并选择基金
    │
    ▼
POST /api/user-funds/positions
{
  fund_code,
  fund_name,
  shares,    // 首次买入份额
  price,    // 买入单价
  notes?
}
    │
    ▼
1. 创建/更新 user_funds 记录
2. 创建 fund_transactions buy 记录
    │
    ▼
返回 position 数据
```

### 加仓

```
点击持仓 → 打开加减仓弹窗
    │
    ▼
选择"买入" → 输入份额、价格
    │
    ▼
POST /api/user-funds/transactions
{
  fund_id,
  type: 'buy',
  shares,
  price,
  notes?
}
    │
    ▼
创建 transaction buy 记录
更新 user_funds (shares, avg_cost 自动计算)
```

### 减仓

```
点击持仓 → 打开加减仓弹窗
    │
    ▼
选择"卖出" → 输入份额、价格
    │
    ▼
POST /api/user-funds/transactions
{
  fund_id,
  type: 'sell',
  shares,
  price,
  notes?
}
    │
    ▼
创建 transaction sell 记录
更新 user_funds (shares, avg_cost 自动计算)
```

### 排序

```
拖拽持仓 → 位置变化
    │
    ▼
PUT /api/user-funds/sort
{
  orders: [
    { id: 'uuid1', sort_order: 0 },
    { id: 'uuid2', sort_order: 1 },
    ...
  ]
}
    │
    ▼
批量更新 sort_order
```

## 实施计划

见 `docs/plans/2026-02-14-fund-transactions-plan.md`
