# Fund Tracker

A Next.js project for tracking fund and stock information with Feishu (Lark) integration.

## Features

- Fund portfolio management with real-time valuation
- Stock holdings comparison
- Feishu Bitable integration for stock analysis records

## Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Feishu Integration

### Configuration

Create `.env.local` with your Feishu app credentials:

```env
FEISHU_APP_ID=cli_xxxxxxxxxxxxx
FEISHU_APP_SECRET=xxxxxxxxxxxxxxxx
FEISHU_BITABLE_APP_TOKEN=xxxxxxxxxx  # Optional: pre-configured bitable
FEISHU_BITABLE_TABLE_ID=xxxxxxxx     # Optional: pre-configured table
```

### Feishu App Setup

1. **Create a Custom App** at [Feishu Open Platform](https://open.feishu.cn/)
2. Get `App ID` and `App Secret` from Basic Info page
3. Add required permissions:
   - `bitable:app` - Create and manage bitables
   - `bitable:record` - Read/write records
   - `wiki:node:read` or `wiki:wiki` - For wiki integration

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Stock Data to Feishu Bitable                         │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
  │   User   │────▶│  Editor  │────▶│   Text   │────▶│ Feishu   │
  │          │     │  Page    │     │  Parser  │     │   API    │
  └──────────┘     └──────────┘     └──────────┘     └──────────┘
       │                 │                 │
       │ Paste text      │ Parse           │ Validate & map
       │                 │                 │
       ▼                 ▼                 ▼
  ┌──────────────────────────────────────────────────────────────┐
  │                   flow: User submits text                     │
  └──────────────────────────────────────────────────────────────┘

  Step 1: User pastes stock info on /editor page
  ─────────────────────────────────────────────────────────────

  ┌──────────────────────────────────────────────────────────────┐
  │ INPUT:                                                       │
  │   300739    明阳电路                                         │
  │   相关板块：PCB元器件                                        │
  │   教学入市区间：21.00-21.20元                               │
  │   操作策略：盘中低吸                                         │
  │   第一压力位：22.90元                                        │
  │   支撑位：19.80                                              │
  │   仓位：10%                                                  │
  │   投资亮点：公司主营业务...                                   │
  └──────────────────────────────────────────────────────────────┘
                                │
                                ▼
  Step 2: Text Parser extracts fields
  ─────────────────────────────────────────────────────────────

  ┌──────────────────────────────────────────────────────────────┐
  │ PARSED:                                                      │
  │   {                                                         │
  │     code: "300739",          // 股票代码                     │
  │     name: "明阳电路",         // 股票名称                     │
  │     sector: "PCB元器件",      // 相关板块                     │
  │     priceRange: "21.00-21.20元",  // 教学入市区间           │
  │     strategy: "盘中低吸",     // 操作策略                     │
  │     pressure: "22.90元",      // 第一压力位                   │
  │     support: "19.80",        // 支撑位                       │
  │     position: "10%",          // 仓位                         │
  │     highlights: "公司..."     // 投资亮点                     │
  │   }                                                         │
  └──────────────────────────────────────────────────────────────┘
                                │
                                ▼
  Step 3: Validate & Map to Feishu Field Names
  ─────────────────────────────────────────────────────────────

  ┌──────────────────────────────────────────────────────────────┐
  │ FIELD MAPPING:                                               │
  │                                                             │
  │   code        ──▶ 股票代码                                  │
  │   name       ──▶ 股票名称                                   │
  │   sector     ──▶ 相关板块                                   │
  │   priceRange ──▶ 教学入市区间                               │
  │   strategy   ──▶ 操作策略                                   │
  │   pressure   ──▶ 第一压力位                                 │
  │   support    ──▶ 支撑位                                     │
  │   position   ──▶ 仓位                                       │
  │   highlights ──▶ 投资亮点                                   │
  │                                                             │
  │   Note: GET /fields first to get actual field IDs/names     │
  └──────────────────────────────────────────────────────────────┘
                                │
                                ▼
  Step 4: API Request
  ─────────────────────────────────────────────────────────────

  ┌──────────────────────────────────────────────────────────────┐
  │ REQUEST:                                                     │
  │                                                             │
  │   POST /bitable/v1/apps/{app_token}                        │
  │              /tables/{table_id}/records                      │
  │                                                             │
  │   Headers:                                                   │
  │     Authorization: Bearer {tenant_access_token}              │
  │     Content-Type: application/json                          │
  │                                                             │
  │   Body:                                                      │
  │   {                                                          │
  │     "fields": {                                             │
  │       "股票代码": "300739",                                  │
  │       "股票名称": "明阳电路",                                │
  │       ...                                                    │
  │     }                                                        │
  │   }                                                          │
  │                                                             │
  │   Note: Use JSON.stringify() to ensure proper format       │
  └──────────────────────────────────────────────────────────────┘
                                │
                                ▼
  Step 5: Feishu Bitable
  ─────────────────────────────────────────────────────────────

  ┌──────────────────────────────────────────────────────────────┐
  │ RESULT (in Feishu):                                         │
  │                                                             │
  │   ┌─────────────────────────────────────────────────────┐   │
  │   │ 股票代码 │ 股票名称 │ 相关板块 │ ...               │   │
  │   ├─────────────────────────────────────────────────────┤   │
  │   │ 300739   │ 明阳电路 │ PCB元器件 │ ...             │   │
  │   └─────────────────────────────────────────────────────┘   │
  │                                                             │
  └──────────────────────────────────────────────────────────────┘
```

### Create Bitable App

#### Option 1: Auto-create (Default)
Leave `FEISHU_BITABLE_APP_TOKEN` and `FEISHU_BITABLE_TABLE_ID` empty. The app will create a new bitable automatically.

#### Option 2: Use Existing Bitable
1. Open your Feishu Bitable
2. Copy the URL: `https://xxx.feishu.cn/base/{app_token}?tbl{table_id}`
3. Configure in `.env.local`

### Grant App Access

**Important**: After creating or configuring a bitable, you must grant access to your app:

1. Open the Feishu Bitable page
2. Click "..." menu (top-right)
3. Click "Add Doc App"
4. Search and add your app

**Error 91403**: If you see `91403 Forbidden`, this means the app doesn't have permission. Grant access as described above.

### Editor Page

Access the editor at `/editor` or `/zh/editor`:

1. Paste stock information in the text area
2. Click "Parse Text" to preview
3. Click "Submit to Feishu" to save to bitable

### Input Format

```
300739    明阳电路
相关板块：PCB元器件
教学入市区间：21.00-21.20元
操作策略：盘中低吸
第一压力位：22.90元
支撑位：19.80
仓位：10%
投资亮点：公司主营业务为印制电路板...
```

## Troubleshooting

### Common Errors

#### 91403 Forbidden
```
{"code":91403,"msg":"Forbidden"}
```
**Cause**: App doesn't have permission to access the bitable
**Solution**:
1. Open the Feishu Bitable page
2. Click "..." menu → "Add Doc App"
3. Search and add your app

#### Field Validation Failed (99992402)
```
{"code":99992402,"msg":"field validation failed"}
```
**Cause**: Field name/type mismatch
**Solution**: Ensure bitable has matching fields:
- 股票代码 (Text)
- 股票名称 (Text)
- 相关板块 (Text)
- 教学入市区间 (Text)
- 操作策略 (Text)
- 第一压力位 (Text)
- 支撑位 (Text)
- 仓位 (Text)
- 投资亮点 (Text)

#### Document Not Found
```
{"code":131005,"msg":"not found: document not found by token xxx"}
```
**Cause**: Using Wiki URL instead of Bitable URL
**Solution**: Use bitable URL format:
`https://xxx.feishu.cn/base/{app_token}?tbl{table_id}`
(not `https://xxx.feishu.cn/wiki/xxx`)

## Tech Stack

- Next.js 16.1.6
- React 19
- TypeScript
- Tailwind CSS
- next-intl (i18n)
- axios

---

## 问题与修复日志 (2025-02-13)

### 1. 多语言与路由重构

#### 问题
- 登录页面闪烁（认证检查未完成前显示未登录态）
- `/en/login` 等 URL 带 locale 前缀的重定向逻辑混乱
- 路由结构不一致（`/` vs `/zh`）

#### 解决方案
- **路由扁平化**：移除 `[locale]` 目录，改为 `(dashboard)` 和 `(auth)` 组。
- **Cookie 存储 Locale**：多语言不再依赖 URL 前缀，而是存储在 `NEXT_LOCALE` Cookie 中，默认 `zh`。
- **中间件优化**：更新 `middleware.ts` 适配无前缀路由，防止 `/zh` 导致的 404。
- **Next.config 清理**：移除可能导致死循环的 `redirects` 配置。

### 2. 管理员权限与 RLS 无限递归

#### 问题
- 访问 `/admin` 显示无权限，即使 `.env.local` 配置了 `ADMIN_EMAIL`。
- API 报错：`infinite recursion detected in policy for relation "user_profiles"`。

#### 原因分析
- **数据库 RLS 策略死循环**：`user_profiles` 表的 "Admins can view all profiles" 策略在检查时查询了自身 (`select 1 from user_profiles...`)，导致无限递归。
- **角色未同步**：`.env.local` 仅作为初始配置，实际权限由数据库 `user_profiles.role` 字段决定。

#### 解决方案
1. **重构 RLS 策略**：
   - 创建 `security definer` 函数 `is_admin()` 来封装管理员检查逻辑。
   - 该函数以超级用户权限运行，绕过 RLS，打破递归。
2. **更新 SQL**：
   ```sql
   create or replace function public.is_admin() returns boolean as $$
   begin
     return exists (select 1 from public.user_profiles where id = auth.uid() and role = 'admin');
   end;
   $$ language plpgsql security definer;
   
   -- 使用函数替代直接查询
   create policy "Admins can view all profiles" on public.user_profiles 
     for select using (public.is_admin());
   ```
3. **手动提权**：需要在 Supabase SQL Editor 执行 `update public.user_profiles set role = 'admin' where email = '...'`。

### 3. Turbopack 缓存问题

#### 问题
- `npm run dev` 频繁崩溃或报错 `Unable to acquire lock`。
- 修改代码后页面 404 或无变化。

#### 解决方案
- 删除 `.next` 缓存目录：`rm -rf .next`。
- 杀死僵尸进程：`lsof -i :3000` 配合 `kill -9 <PID>`。
- 重启开发服务器。
