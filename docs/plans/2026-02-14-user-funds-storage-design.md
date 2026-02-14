# 用户基金持仓数据库存储设计

## 背景

当前基金列表存储在 `localStorage` 中，需要迁移到 Supabase 数据库，实现用户持仓持久化存储。

## 目标

- 将用户添加的基金持久化存储到 Supabase 数据库
- 支持存储持有份额和成本价，用于计算实际收益
- 用户数据隔离，每个用户只能查看和管理自己的基金

## 数据库设计

### 新建 `user_funds` 表

```sql
create table public.user_funds (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  fund_code varchar(20) not null,
  fund_name text,
  shares numeric(18, 4) not null default 0,
  cost numeric(18, 6) not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, fund_code)
);

alter table public.user_funds enable row level security;

create policy "Users can manage own funds"
  on public.user_funds for all
  using (auth.uid() = user_id);
```

### 表结构说明

| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 主键 |
| user_id | uuid | 关联 auth.users |
| fund_code | varchar(20) | 基金代码 |
| fund_name | text | 基金名称（冗余存储，避免重复查询） |
| shares | numeric(18,4) | 持有份额 |
| cost | numeric(18,6) | 成本单价 |
| created_at | timestamptz | 添加时间 |
| updated_at | timestamptz | 更新时间 |

### 索引

- `unique(user_id, fund_code)` - 防止同一基金重复添加

## API 设计

### 基础路径

`/api/user-funds`

### 接口列表

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/user-funds` | 获取用户所有基金持仓 |
| POST | `/api/user-funds` | 添加基金（支持设置份额和成本） |
| PUT | `/api/user-funds/[id]` | 更新份额或成本价 |
| DELETE | `/api/user-funds/[id]` | 删除基金 |

### 响应格式

```typescript
// GET /api/user-funds 响应
interface UserFund {
  id: string;
  fund_code: string;
  fund_name: string;
  shares: number;
  cost: number;
  created_at: string;
  updated_at: string;
}

// 带计算字段的响应（用于前端展示）
interface UserFundWithValue extends UserFund {
  nav: number;              // 当前净值
  currentValue: number;      // 当前市值 = nav * shares
  totalCost: number;        // 总成本 = cost * shares
  profit: number;           // 收益 = currentValue - totalCost
  profitPercent: number;    // 收益率
  estimatedNav: number;     // 估算净值
  estimatedChange: number;  // 估算涨跌
  estimatedChangePercent: number; // 估算涨跌幅
}
```

## 前端改动

### 首页 `/src/app/(dashboard)/page.tsx`

1. 移除 `localStorage` 相关逻辑
2. 调用 `GET /api/user-funds` 获取基金列表
3. 添加/删除基金调用 API

### 基金列表展示

新增展示列：

| 列名 | 说明 | 计算方式 |
|------|------|----------|
| 持有份额 | 用户持有的份额 | 直接显示 |
| 成本价 | 买入成本单价 | 直接显示 |
| 当前市值 | 当前持仓价值 | nav × shares |
| 累计收益 | 收益金额 | currentValue - totalCost |
| 收益率 | 收益百分比 | profit / totalCost × 100% |

### 添加基金流程

1. 用户搜索并选择基金
2. 弹出弹窗，输入持有份额和成本价
3. 提交保存到数据库

### 组件改动

- `addFund` → API POST + 弹窗输入
- `removeFund` → API DELETE
- 新增修改持仓弹窗（修改份额/成本价）

## 数据流程

```
用户添加基金
    │
    ▼
搜索基金 → 获取基金代码、名称
    │
    ▼
弹窗输入份额、成本价
    │
    ▼
POST /api/user-funds → 保存到数据库
    │
    ▼
首页 GET /api/user-funds → 获取持仓列表
    │
    ▼
调用 /api/funds/realtime → 获取实时估值
    │
    ▼
计算市值、收益，展示
```

## 待确认事项

- [x] 新建专用表存储用户基金
- [x] 支持持有份额和成本价
- [x] 展示市值和收益信息
- [ ] 是否需要支持交易记录（买入/卖出）？

## 实施计划

见 `docs/plans/2026-02-14-user-funds-storage-plan.md`
