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

## 多语言与认证重定向优化 (2025-02-13)

### 问题描述

1. **登录页面闪烁** - 认证检查完成后才显示页面，导致用户体验差
2. **URL locale 导致重定向问题** - `/en/login` 重定向到 `/login` 时丢失 locale
3. **重定向逻辑不一致** - 未登录访问受保护页面时可能直接显示首页

### 解决方案

#### 1. 多语言改用 Cookie 存储（默认中文 `zh`）

**改动文件：**
- `src/i18n/routing.ts` - 添加 `NEXT_LOCALE` cookie 常量，默认语言改为 `zh`
- `src/i18n/request.ts` - 从 cookie 读取 locale，而非 URL 参数

```typescript
// src/i18n/routing.ts
export const routing = defineRouting({
  locales: ['en', 'zh'],
  defaultLocale: 'zh'  // 改为中文
});
export const NEXT_LOCALE = 'NEXT_LOCALE';

// src/i18n/request.ts
export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const incoming = cookieStore.get(NEXT_LOCALE)?.value;
  const locale = isLocale(incoming) ? incoming : routing.defaultLocale;
  return { locale, messages: ... };
});
```

#### 2. 简化路由结构 - 移除 URL 中的 `[locale]` 段

**改动：**
- 移除 `src/app/[locale]/` 目录
- 创建 route groups: `(auth)` 和 `(dashboard)`

```
之前:                              现在:
src/app/[locale]/page.tsx    →    src/app/(dashboard)/page.tsx
src/app/[locale]/editor/     →    src/app/(dashboard)/editor/
src/app/[locale]/admin/      →    src/app/(dashboard)/admin/
src/app/[locale]/fund/       →    src/app/(dashboard)/fund/
src/app/[locale]/login/      →    src/app/(auth)/login/
src/app/[locale]/register/   →    src/app/(auth)/register/
```

#### 3. 更新布局文件

**改动文件：** `src/app/layout.tsx`
- 移除 `[locale]` 参数
- 直接包含 AuthProvider 和 Navbar

```typescript
// src/app/layout.tsx
export default async function RootLayout({ children }) {
  const messages = await getMessages();
  return (
    <html lang="zh">
      <body>
        <NextIntlClientProvider messages={messages}>
          <AuthProvider>
            <Navbar />
            <main>{children}</main>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

#### 4. 优化 AuthProvider - 添加 loading 状态防止闪烁

**改动文件：** `src/components/AuthProvider.tsx`

```typescript
// 添加 LoadingSpinner 组件
function LoadingSpinner() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-2 border-[#00ffff] border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-400 text-sm">Loading...</span>
      </div>
    </div>
  );
}

// 认证期间显示 loading
{isLoading ? <LoadingSpinner /> : children}
```

#### 5. 修复语言切换 - 使用 Cookie

**改动文件：** `src/components/Navbar.tsx`

```typescript
// 从 cookie 读取语言
useEffect(() => {
  const cookieLocale = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${NEXT_LOCALE}=`))
    ?.split('=')[1];
  if (cookieLocale === 'en' || cookieLocale === 'zh') {
    setLocale(cookieLocale);
  }
}, []);

// 点击切换时写入 cookie
const switchLocale = (newLocale: string) => {
  document.cookie = `${NEXT_LOCALE}=${newLocale}; path=/; max-age=31536000`;
  setLocale(newLocale);
  router.refresh();
};
```

### 所犯的错误及修复

| 错误 | 修复 |
|------|------|
| `import "../globals.css"` 路径错误 | 改为 `import "./globals.css"` |
| 登录页面残留 `pathname` 变量引用导致类型错误 | 移除未使用的 `usePathname` 和 `pathname` 引用 |
| `supabase auth signup` CLI 命令不存在 | 改用 Supabase Dashboard UI 创建用户 |

### URL 变更对照

| 之前 | 现在 |
|------|------|
| `/en/login` | `/login` |
| `/zh/editor` | `/editor` |
| `/en/admin` | `/admin` |
| `/zh/fund/320007` | `/fund/320007` |

### 验证测试

1. ✅ 访问 `/login` → 显示登录页面（无闪烁）
2. ✅ 未登录访问 `/` → 重定向到 `/login`
3. ✅ 登录后 → 重定向回 `/`
4. ✅ 切换语言 → 保存在 cookie，默认中文
5. ✅ 登出 → 跳转 `/login`
