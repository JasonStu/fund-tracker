# AGENTS.md - Agentic Coding Guidelines

本文档为在该代码库中工作的 AI 代理提供开发指南。

---

## 1. 命令 (Commands)

### 开发命令
```bash
npm run dev           # 启动开发服务器 (http://localhost:3000)
npm run build         # 生产构建
npm run start         # 启动生产服务器
npm run lint          # ESLint 检查
```

### 测试命令
```bash
npm run test                    # 运行所有 Playwright 测试
npm run test:ui                 # Playwright UI 模式交互测试
npm run test:report             # 查看测试报告
npx playwright test <file>     # 运行单个测试文件
```

### 故障排除
```bash
rm -rf .next                    # 清除 Turbopack 缓存（解决 404/卡顿问题）
NEXT_TURBOPACK=0 npm run dev   # 禁用 Turbopack
```

---

## 2. 代码风格 (Code Style)

### TypeScript
- 启用 strict 模式 (`tsconfig.json` 中 `strict: true`)
- 使用 interface 定义类型，避免 type 别名（除非是联合类型）
- 投资品种类型使用字面量联合：`type InvestmentType = 'fund' | 'stock'`

### 导入顺序
1. Node.js 标准库 (`node:xxx`)
2. 外部 npm 包 (`axios`, `next`, `react`)
3. 内部模块 (`@/xxx`)

```typescript
// 正确示例
import { NextResponse } from 'next/server';
import axios from 'axios';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Position, Transaction } from '@/types';
```

### 组件约定
- 客户端组件必须添加 `'use client'` 指令
- 组件文件使用 PascalCase 命名：`PositionCard.tsx`
- Props 类型使用 interface 单独定义，文件名与组件同名

```typescript
// 正确示例
'use client';

import { PlusIcon } from '@heroicons/react/20/solid';

export interface PositionCardProps {
  position: { id: string; code: string; name: string };
  onAddPosition: (code: string) => void;
}

export default function PositionCard({ position, onAddPosition }: PositionCardProps) {
  // ...
}
```

### 命名规范
- 变量/函数：camelCase (`getFundRealtimeValuation`, `userHoldings`)
- 组件/类型：PascalCase (`PositionCard`, `Transaction`)
- 数据库字段：snake_case (`fund_code`, `sort_order`, `user_id`)
- 常量：UPPER_SNAKE_CASE（如错误码 `ErrorCodes.TIMEOUT`）

### 格式化
- 使用 2 空格缩进
- 字符串优先使用单引号
- 尾部逗号可选
- Tailwind 类名按功能分组：布局 → 尺寸 → 颜色 → 状态

---

## 3. 项目约定 (Project Conventions)

### 技术栈
- **框架**: Next.js 16.1.6 (App Router)
- **UI**: React 19, Tailwind CSS 4
- **认证**: Supabase SSR
- **i18n**: next-intl (locales: `en`, `zh`，默认 `zh`)
- **测试**: Playwright

### 目录结构
```
src/
├── app/                  # Next.js App Router 页面
│   ├── (auth)/          # 认证页面（登录/注册）
│   ├── (dashboard)/     # 受保护页面
│   │   ├── fund/[code]/ # 基金详情页
│   │   └── editor/      # 飞书编辑器
│   └── api/             # API 路由
├── components/          # React 组件
├── lib/                 # 工具库
│   ├── api/             # API 客户端
│   ├── supabase/       # Supabase 客户端
│   └── hooks/          # 自定义 Hooks
├── types/               # TypeScript 类型定义
└── messages/            # i18n 翻译文件 (en.json, zh.json)
```

### 路径别名
```typescript
// tsconfig.json 配置
"paths": { "@/*": ["./src/*"] }

// 使用示例
import { Position } from '@/types';
import { apiClient } from '@/lib/api/client';
```

### Tailwind CSS 4
- 无 tailwind.config.js，使用 CSS 变量和 @theme 配置
- 颜色使用语义化名称：`bg-[#1a1a25]`, `text-[#e0e0e0]`
- 深色主题前缀：`dark:`（如已配置）

---

## 4. API 开发 (API Development)

### API 路由模式
```typescript
// src/app/api/user-funds/route.ts
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 业务逻辑...

    return NextResponse.json({ positions, transactions });
  } catch (error) {
    console.error('GET /api/user-funds error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### API 客户端使用
```typescript
// 使用 src/lib/api/client.ts 单例
import { apiClient } from '@/lib/api/client';

const result = await apiClient.get<{ positions: Position[] }>('/user-funds');
if (result.success) {
  console.log(result.data.positions);
} else {
  console.error(result.error.message);
}
```

### 错误处理
- 预期错误：返回 `{ error: '错误描述' }`，状态码 400/401/404/409
- 未知错误：返回 `{ error: 'Internal server error' }`，状态码 500
- 打印错误日志：`console.error('路径 error:', error)`

---

## 5. 数据库 (Database)

### 表结构

**user_profiles** - 用户角色
| 字段 | 类型 | 说明 |
|------|------|------|
| id | uuid | 关联 auth.users |
| email | text | 用户邮箱 |
| role | text | 'admin' 或 'user' |
| created_at | timestamptz | 创建时间 |

**invitation_codes** - 邀请码
| 字段 | 类型 | 说明 |
|------|------|------|
| code | varchar(20) | 邀请码 |
| used_by | text | 使用者邮箱 |
| expires_at | timestamptz | 过期时间 |
| is_active | boolean | 是否可用 |

**user_funds** - 用户持仓
| 字段 | 类型 | 说明 |
|------|------|------|
| user_id | uuid | 所属用户 |
| fund_code | varchar(20) | 基金/股票代码 |
| fund_name | text | 名称 |
| type | varchar(10) | 'fund' 或 'stock' |
| sort_order | integer | 排序顺序 |

**fund_transactions** - 交易记录
| 字段 | 类型 | 说明 |
|------|------|------|
| user_id | uuid | 所属用户 |
| fund_code | varchar(20) | 基金/股票代码 |
| transaction_type | varchar(10) | 'buy' 或 'sell' |
| shares | numeric(18,4) | 数量 |
| price | numeric(18,6) | 单价 |

### RLS 策略
- 使用 `public.is_admin()` 函数检查管理员权限
- 用户只能操作自己的数据

---

## 6. 业务逻辑 (Business Logic)

### 投资品种类型
- `fund`: 基金（通过东方财富基金 API 获取净值）
- `stock`: 股票（通过东方财富股票 API 获取实时价）

### FIFO 成本计算
持仓成本采用**先进先出法**计算：

```typescript
// 买入时创建批次
buyLots.push({ shares: txShares, cost: txShares * txPrice, pricePerShare: txPrice });

// 卖出时按批次消减
while (sharesToSell > 0 && buyLots.length > 0) {
  const lot = buyLots[0];
  if (lot.shares <= sharesToSell) {
    sharesToSell -= lot.shares;
    buyLots.shift();
  } else {
    lot.shares -= sharesToSell;
    sharesToSell = 0;
  }
}
```

### 实时行情 API
- **基金**: `http://fundgz.1234567.com.cn/js/{code}.js` → 返回 `dwgz`(净值), `gsz`(估算净值)
- **股票**: `https://push2.eastmoney.com/api/qt/stock/get` → 返回 `f43`(现价), `f169`(涨跌额), `f170`(涨跌幅)

### 收益计算
- **已实现收益** (realized profit): 卖出时实际获得的收益
- **未实现收益** (unrealized profit): `(当前份额 × 实时净值) - 剩余成本`
- **总收益** = 已实现收益 + 未实现收益
- **收益率** = 总收益 / 总买入成本 × 100%

---

## 7. 测试 (Testing)

### 测试框架
- 使用 Playwright 进行端到端测试
- 测试文件位于 `tests/` 目录
- 配置文件：`playwright.config.ts`

### 编写测试
```typescript
// tests/example.spec.ts
import { test, expect } from '@playwright/test';

test('dashboard loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('基金');
});
```

### 运行测试
```bash
npm run test                    # 所有测试
npx playwright test login.spec.ts  # 单文件
npm run test:ui                 # UI 模式
```

---

## 8. 部署 (Deployment)

### Vercel 部署
```bash
vercel login
vercel link
vercel --prod
```

### 环境变量
在 Vercel 项目设置中添加：
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `FEISHU_APP_ID`
- `FEISHU_APP_SECRET`

---

## 9. 常见问题 (Troubleshooting)

### 权限问题
在 Supabase SQL Editor 中执行：
```sql
UPDATE public.user_profiles SET role = 'admin' WHERE email = 'your@email.com';
```

### 中间件问题
Next.js 16 使用 `src/middleware.ts` 处理 i18n 和认证。

### 数据库迁移
```bash
# 在 Supabase SQL Editor 中运行迁移文件
# 例如：supabase/migrations/002_add_type_column.sql
```

---

## 10. 注意事项

1. **不要提交 secrets**: 禁止提交 `.env`, `credentials.json` 等包含密钥的文件
2. **使用现有模式**: 遵循现有代码风格，不要引入新的库或模式
3. **类型安全**: 优先使用 TypeScript 类型，避免 `any`
4. **错误处理**: 所有 API 路由必须有 try-catch 错误处理
5. **注释**: 不主动添加注释，除非解释复杂的业务逻辑
