# 股票详情页与日涨跌修复实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 修复日涨跌计算错误，并创建股票详情页

**Architecture:** 修复 API 返回字段使用错误，创建新的股票详情页组件，使用与基金详情页一致的 Tab 结构

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, ECharts

---

## 实现步骤

### Task 1: 修复日涨跌计算错误

**Files:**
- Modify: `src/app/api/user-funds/route.ts:38-78` (getStockRealtimePrice 函数)

**Step 1: 修复 getStockRealtimePrice 函数**

将错误的字段映射替换为正确的：
```tsx
// 错误的代码（删除）
// const f57 = parseFloat(data.data.f57) || 0; // 这是股票代码！
// const change = f43 - f57; // 53.48 - 2050 = -1996.52

// 正确的代码（使用 f169 和 f170）
const f169 = parseFloat(data.data.f169) || 0; // 涨跌额
const f170 = parseFloat(data.data.f170) || 0; // 涨跌幅%

return {
  currentPrice: f43,
  previousClose: f43 - f169, // 从当前价和涨跌额计算昨收价
  change: f169,
  changePercent: f170,
  volume: f86,
};
```

**Step 2: 验证修复**

1. 重启开发服务器
2. 访问页面查看股票日涨跌显示正确

**Step 3: Commit**

```bash
git add src/app/api/user-funds/route.ts
git commit -m "fix(api): 修复股票日涨跌计算错误，使用正确的f169/f170字段"
```

---

### Task 2: 创建股票 K线 API

**Files:**
- Create: `src/app/api/stocks/kline/route.ts`

**Step 1: 创建 K线 API**

从东方财富获取股票 K线数据：
```ts
import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const type = searchParams.get('type') || '1'; // 日K

  if (!code) {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  }

  // 转换市场代码
  let market = '';
  if (code.startsWith('6')) {
    market = '1'; // 上海
  } else if (code.startsWith('0') || code.startsWith('3')) {
    market = '0'; // 深圳
  }

  try {
    // 东方财富 K线 API
    const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?` +
      `secid=${market}.${code}&` +
      `fields1=f1,f2,f3,f4,f5,f6&` +
      `fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&` +
      `klt=101&` + // 日K
      `fqt=1&` +
      `end=20500101&` +
      `lmt=500`;

    const response = await axios.get(url, { timeout: 10000 });
    const data = response.data;

    if (data.data?.klines) {
      const klines = data.data.klines.map((line: string) => {
        const parts = line.split(',');
        return {
          date: parts[0],
          open: parseFloat(parts[1]),
          close: parseFloat(parts[2]),
          high: parseFloat(parts[3]),
          low: parseFloat(parts[4]),
          volume: parseFloat(parts[5]),
          amount: parseFloat(parts[6]),
        };
      });

      return NextResponse.json({ klines });
    }

    return NextResponse.json({ klines: [] });
  } catch (error) {
    console.error('Kline API error:', error);
    return NextResponse.json({ error: 'Failed to fetch kline' }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/stocks/kline/route.ts
git commit -m "feat(api): 添加股票K线数据API"
```

---

### Task 3: 创建股票详情页

**Files:**
- Create: `src/app/(dashboard)/stock/[code]/page.tsx`

**Step 1: 创建股票详情页组件**

参考基金详情页 `src/app/(dashboard)/fund/[code]/page.tsx`，创建类似的股票详情页：
- 头部：股票名称、代码、实时价格
- Tab 切换：持仓概览、走势图表、交易记录
- 使用橙色主题 (#ff9500)

**Step 2: 添加股票类型到 Position 类型**

确保 types/index.ts 包含股票的完整类型定义。

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/stock/\[code\]/page.tsx
git commit -m "feat(ui): 添加股票详情页"
```

---

### Task 4: 验证和测试

**Files:**
- 测试: `http://localhost:3000/stock/[code]`

**Step 1: 验证日涨跌修复**

1. 访问仪表盘页面
2. 查看股票日涨跌显示正确

**Step 2: 验证股票详情页**

1. 点击股票卡片进入详情页
2. 验证 Tab 切换功能
3. 验证 K线图表显示

**Step 3: Commit**

```bash
git commit -m "test: 验证股票详情页功能正常"
```

---

### Task 5: 更新测试用例文档

**Files:**
- Modify: `TEST_CASES.md`

**Step 1: 添加测试用例**

```markdown
### TC019: 股票日涨跌显示
**步骤:**
1. 进入仪表盘页面
2. 点击股票 Tab
3. 查看股票的日涨跌和涨幅

**预期结果:**
- 日涨跌显示正确的数值
- 涨幅显示正确的百分比

### TC020: 股票详情页
**步骤:**
1. 点击任意股票卡片
2. 进入股票详情页

**预期结果:**
- 显示股票名称、代码、实时价格
- Tab 切换正常
- K线图表显示正确
```

**Step 2: Commit**

```bash
git add TEST_CASES.md
git commit -m "docs: 添加股票详情页测试用例TC019-TC020"
```
