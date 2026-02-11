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
