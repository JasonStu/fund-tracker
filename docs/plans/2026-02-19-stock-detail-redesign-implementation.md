# 股票详情页重构实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 重构股票详情页，添加i18n支持、分时图/K线图切换、均线选择器、副图指标

**Architecture:** 
- 前端：重构 `src/app/(dashboard)/stock/[code]/page.tsx`，新增均线选择器组件
- 后端：新增3个API端点（分时、K线周期、资金流向）
- 技术指标：使用 `technicalindicators` npm库

**Tech Stack:** 
- `technicalindicators` - 技术指标计算
- ECharts - 图表展示
- next-intl - i18n国际化

---

## Task 1: 添加 i18n 翻译

**Files:**
- Modify: `messages/zh.json`
- Modify: `messages/en.json`

**Step 1: 添加中文翻译**

在 `messages/zh.json` 中添加 `StockDetail` 命名空间：

```json
"StockDetail": {
  "loading": "加载中...",
  "error": "获取数据失败",
  "backToPortfolio": "返回自选",
  "currentPrice": "现价",
  "change": "涨跌额",
  "changePercent": "涨跌幅",
  "lastUpdate": "更新时间",
  "tabs": {
    "overview": "概览",
    "chart": "图表",
    "transactions": "交易记录"
  },
  "overview": {
    "shares": "持有股数",
    "avgCost": "成本价",
    "totalCost": "总成本",
    "currentValue": "当前市值",
    "totalPL": "累计盈亏",
    "plPercent": "收益率"
  },
  "chart": {
    "chartType": "图表类型",
    "intraday": "分时",
    "daily": "日K",
    "weekly": "周K",
    "monthly": "月K",
    "maSelector": "均线选择",
    "addMA": "添加均线",
    "maPlaceholder": "输入周期",
    "indicators": "指标"
  },
  "transactions": {
    "date": "日期",
    "type": "类型",
    "shares": "股数",
    "price": "价格",
    "amount": "金额",
    "notes": "备注",
    "buy": "买入",
    "sell": "卖出",
    "noTransactions": "暂无交易记录"
  }
}
```

**Step 2: 添加英文翻译**

在 `messages/en.json` 中添加对应英文翻译：

```json
"StockDetail": {
  "loading": "Loading...",
  "error": "Failed to load data",
  "backToPortfolio": "Back to Portfolio",
  "currentPrice": "Current Price",
  "change": "Change",
  "changePercent": "Change %",
  "lastUpdate": "Last Update",
  "tabs": {
    "overview": "Overview",
    "chart": "Chart",
    "transactions": "Transactions"
  },
  "overview": {
    "shares": "Shares",
    "avgCost": "Avg Cost",
    "totalCost": "Total Cost",
    "currentValue": "Current Value",
    "totalPL": "Total P/L",
    "plPercent": "P/L %"
  },
  "chart": {
    "chartType": "Chart Type",
    "intraday": "Intraday",
    "daily": "Daily",
    "weekly": "Weekly",
    "monthly": "Monthly",
    "maSelector": "MA Selector",
    "addMA": "Add MA",
    "maPlaceholder": "Enter period",
    "indicators": "Indicators"
  },
  "transactions": {
    "date": "Date",
    "type": "Type",
    "shares": "Shares",
    "price": "Price",
    "amount": "Amount",
    "notes": "Notes",
    "buy": "Buy",
    "sell": "Sell",
    "noTransactions": "No transactions yet"
  }
}
```

---

## Task 2: 安装技术指标库

**Files:**
- Modify: `package.json`

**Step 1: 添加依赖**

```bash
npm install technicalindicators
```

或者直接修改 package.json 添加：

```json
"technicalindicators": "^3.1.0"
```

**Step 2: 安装**

```bash
npm install
```

---

## Task 3: 创建均线选择器组件

**Files:**
- Create: `src/components/StockMaSelector.tsx`

**Step 1: 创建组件**

```typescript
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';

export interface MaSelectorProps {
  selectedMas: number[];
  customMas: number[];
  onTogglePreset: (ma: number) => void;
  onAddCustom: (ma: number) => void;
  onRemoveCustom: (ma: number) => void;
}

const PRESET_MAS = [5, 10, 15, 20, 60];

export function StockMaSelector({
  selectedMas,
  customMas,
  onTogglePreset,
  onAddCustom,
  onRemoveCustom,
}: MaSelectorProps) {
  const t = useTranslations('StockDetail.chart');
  const [customInput, setCustomInput] = useState('');

  const handleAddCustom = () => {
    const num = parseInt(customInput, 10);
    if (!isNaN(num) && num > 0 && !customMas.includes(num)) {
      onAddCustom(num);
      setCustomInput('');
    }
  };

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-gray-400">{t('maSelector')}:</span>
      <div className="flex gap-2">
        {PRESET_MAS.map((ma) => (
          <button
            key={ma}
            onClick={() => onTogglePreset(ma)}
            className={clsx(
              'px-2 py-1 text-xs rounded transition-colors',
              selectedMas.includes(ma)
                ? 'bg-[#ff9500] text-white'
                : 'bg-[#2a2a3a] text-gray-400 hover:text-white'
            )}
          >
            MA{ma}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder={t('maPlaceholder')}
          className="w-20 px-2 py-1 bg-[#2a2a3a] text-white text-xs rounded border border-[#3a3a4a] focus:border-[#ff9500] outline-none"
          onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
        />
        <button
          onClick={handleAddCustom}
          className="px-2 py-1 text-xs bg-[#2a2a3a] text-gray-400 hover:text-white rounded transition-colors"
        >
          {t('addMA')}
        </button>
      </div>
      {customMas.length > 0 && (
        <div className="flex gap-1">
          {customMas.map((ma) => (
            <button
              key={ma}
              onClick={() => onRemoveCustom(ma)}
              className="px-2 py-1 text-xs bg-purple-900/50 text-purple-300 rounded hover:bg-purple-900 transition-colors"
            >
              MA{ma} ×
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Task 4: 创建分时图 API

**Files:**
- Create: `src/app/api/stocks/intraday/route.ts`

**Step 1: 创建API**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const days = parseInt(searchParams.get('days') || '5', 10);

  if (!code) {
    return NextResponse.json({ error: 'code is required' }, { status: 400 });
  }

  try {
    // 转换股票代码格式
    let market = '';
    if (code.startsWith('6')) {
      market = '1.sh';
    } else if (code.startsWith('0') || code.startsWith('3')) {
      market = '0.sz';
    }

    const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get`;
    const response = await axios.get(url, {
      params: {
        secid: market + code,
        fields1: 'f1,f2,f3,f4,f5,f6',
        fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
        klt: 101, // 分时数据
        fqt: 1,
        beg: days === 1 ? 0 : (0 - days),
        end: 20500101,
      },
      timeout: 10000,
    });

    const data = response.data;
    if (!data.data || !data.data.klines) {
      return NextResponse.json({ intraday: [] });
    }

    const klines = data.data.klines;
    const intraday = klines.map((line: string) => {
      const parts = line.split(',');
      return {
        date: parts[0],
        time: parts[1],
        open: parseFloat(parts[2]),
        close: parseFloat(parts[3]),
        high: parseFloat(parts[4]),
        low: parseFloat(parts[5]),
        volume: parseFloat(parts[6]),
        amount: parseFloat(parts[7]),
        avgPrice: parseFloat(parts[8]) || 0,
      };
    });

    return NextResponse.json({ intraday });
  } catch (error) {
    console.error('Fetch intraday failed:', error);
    return NextResponse.json({ error: 'Failed to fetch intraday data' }, { status: 500 });
  }
}
```

---

## Task 5: 创建资金流向 API

**Files:**
- Create: `src/app/api/stocks/moneyflow/route.ts`

**Step 1: 创建API**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'code is required' }, { status: 400 });
  }

  try {
    let market = '';
    if (code.startsWith('6')) {
      market = '1.' + code;
    } else if (code.startsWith('0') || code.startsWith('3')) {
      market = '0.' + code;
    }

    // 资金流向接口
    const url = `https://push2.eastmoney.com/api/qt/stock/fflow/daykline/get`;
    const response = await axios.get(url, {
      params: {
        secid: market,
        fields1: 'f1,f2,f3,f7',
        fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64,f65',
        ltType: 1,
        heType: 1,
        klt: 1,
        beg: 0,
        end: 30,
      },
      timeout: 10000,
    });

    const data = response.data;
    if (!data.data || !data.data.klines) {
      return NextResponse.json({ moneyflow: [] });
    }

    const klines = data.data.klines;
    const moneyflow = klines.map((line: string) => {
      const parts = line.split(',');
      return {
        date: parts[0],
        mainInflow: parseFloat(parts[1]) || 0,
        mainOutflow: parseFloat(parts[2]) || 0,
        mainNetInflow: parseFloat(parts[3]) || 0,
        retailInflow: parseFloat(parts[4]) || 0,
        retailOutflow: parseFloat(parts[5]) || 0,
        retailNetInflow: parseFloat(parts[6]) || 0,
      };
    });

    return NextResponse.json({ moneyflow });
  } catch (error) {
    console.error('Fetch moneyflow failed:', error);
    return NextResponse.json({ error: 'Failed to fetch moneyflow data' }, { status: 500 });
  }
}
```

---

## Task 6: 修改 K线 API 支持周期

**Files:**
- Modify: `src/app/api/stocks/kline/route.ts`

**Step 1: 添加 period 参数支持**

修改现有K线API，添加 `period` 参数：

```typescript
// 在 GET 函数中添加
const period = searchParams.get('period') || 'daily';

const periodMap: Record<string, number> = {
  daily: 101,   // 日K
  weekly: 102,  // 周K
  monthly: 103, // 月K
};

const klt = periodMap[period] || 101;
```

---

## Task 7: 重构股票详情页

**Files:**
- Modify: `src/app/(dashboard)/stock/[code]/page.tsx`

**Step 1: 添加 i18n 支持**

在组件顶部添加：

```typescript
import { useTranslations } from 'next-intl';
import { StockMaSelector } from '@/components/StockMaSelector';
import { MACD, KDJ, SMA, EMA, BBI } from 'technicalindicators';
```

在组件内添加：

```typescript
const t = useTranslations('StockDetail');
const tOverview = useTranslations('StockDetail.overview');
const tChart = useTranslations('StockDetail.chart');
const tTransactions = useTranslations('StockDetail.transactions');
```

**Step 2: 添加状态**

```typescript
// 图表类型
const [chartType, setChartType] = useState<'intraday' | 'daily' | 'weekly' | 'monthly'>('intraday');

// 均线选择
const [selectedMas, setSelectedMas] = useState<number[]>([5, 10, 20]);
const [customMas, setCustomMas] = useState<number[]>([]);

// 分时数据
const [intradayData, setIntradayData] = useState<any[]>([]);

// 资金流向数据
const [moneyflowData, setMoneyflowData] = useState<any[]>([]);
```

**Step 3: 添加数据获取**

```typescript
// 获取分时数据
useEffect(() => {
  if (chartType === 'intraday' && code) {
    axios.get(`/api/stocks/intraday?code=${code}&days=5`)
      .then(res => setIntradayData(res.data.intraday || []))
      .catch(console.error);
  }
}, [chartType, code]);

// 获取资金流向
useEffect(() => {
  if (code) {
    axios.get(`/api/stocks/moneyflow?code=${code}`)
      .then(res => setMoneyflowData(res.data.moneyflow || []))
      .catch(console.error);
  }
}, [code]);
```

**Step 4: 计算技术指标**

```typescript
// MACD 计算
const macdInput = useMemo(() => {
  const closes = klineData.map(k => k.close);
  return new MACD({
    values: closes,
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
    SimpleMAOscillator: false,
    SimpleMASignal: false,
  }).getResult();
}, [klineData]);

// KDJ 计算
const kdjInput = useMemo(() => {
  const highs = klineData.map(k => k.high);
  const lows = klineData.map(k => k.low);
  const closes = klineData.map(k => k.close);
  return new KDJ({
    high: highs,
    low: lows,
    close: closes,
    period: 9,
    signalPeriod: 3,
  }).getResult();
}, [klineData]);
```

**Step 5: 更新图表配置**

根据 chartType 切换显示分时图或K线图，并配置副图。

---

## Task 8: 测试和验证

**Step 1: 运行 lint 检查**

```bash
npm run lint
```

**Step 2: 运行类型检查**

```bash
npx tsc --noEmit
```

**Step 3: 测试页面**

```bash
npm run dev
```

访问 http://localhost:3000/stock/600000 验证：
- i18n 切换是否生效
- 分时/日K/周K/月K 切换是否正常
- 均线选择器是否可用
- 副图指标是否显示正确

---

## 执行选项

**Plan complete and saved to `docs/plans/2026-02-19-stock-detail-redesign.md`. Two execution options:**

1. **Subagent-Driven (本会话)** - 我为每个任务派遣新的子代理，任务间进行代码审查，快速迭代

2. **Parallel Session (新会话)** - 在新会话中使用 executing-plans，批量执行并设置检查点

你想选择哪种执行方式？
