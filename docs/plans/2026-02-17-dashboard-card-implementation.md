# 仪表盘卡片布局实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 将基金和股票的列表显示改为流式卡片布局，解决显示不全问题，同时保持所有现有功能。

**Architecture:** 使用 Tailwind CSS 响应式网格系统，桌面端 2-3 列，移动端 1 列。保留所有现有功能（搜索、拖拽排序、加减仓、交易记录、删除）。

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4, @dnd-kit

---

## 任务总览

1. 编写测试用例
2. 修改 Dashboard 页面使用卡片布局
3. 验证所有功能正常工作
4. 提交代码

---

### 任务 1: 编写测试用例

**Files:**
- 查看: `TEST_CASES.md` - 了解现有测试结构

**Step 1: 更新测试用例文档**

添加卡片布局测试用例到 TEST_CASES.md:

```markdown
### TC015: 基金卡片显示
**步骤:**
1. 进入仪表盘页面
2. 查看基金板块

**预期结果:**
- 基金以卡片形式显示
- 每行显示 2-3 列（根据屏幕宽度）
- 卡片显示：名称、份额、成本价、当前净值、市值、收益率
- 操作按钮始终可见

**验证方法:**
- [ ] 基金以卡片网格显示
- [ ] 响应式布局正常（调整浏览器宽度）
- [ ] 所有数据正确显示

### TC016: 股票卡片显示
**步骤:**
1. 进入仪表盘页面
2. 查看股票板块

**预期结果:**
- 股票以卡片形式显示
- 显示：名称、持股数、买入均价、当前股价、日涨跌、日收益、持仓总额、总收益
- 操作按钮始终可见

**验证方法:**
- [ ] 股票以卡片网格显示
- [ ] 所有数据正确显示
- [ ] 操作按钮始终可见

### TC017: 响应式布局
**步骤:**
1.大 在屏幕上查看（≥1600px）
2. 在笔记本上查看（≥1280px）
3. 在平板上查看（≥768px）
4. 在手机上查看（<768px）

**预期结果:**
- 大屏幕：3 列
- 笔记本：2 列
- 平板：2 列
- 手机：1 列

**验证方法:**
- [ ] 各断点布局正确
```

---

### 任务 2: 修改 Dashboard 页面使用卡片布局

**Files:**
- Modify: `src/app/(dashboard)/page.tsx`

**Step 1: 创建 FundCard 组件**

在 page.tsx 中添加 FundCard 组件:

```tsx
// 基金卡片组件
function FundCard({
  position,
  onAddPosition,
  onDelete,
  onViewHistory,
}: {
  position: Position;
  onAddPosition: (code: string, name: string, type: InvestmentType) => void;
  onDelete: (id: string, name: string) => void;
  onViewHistory: (code: string, name: string, type: InvestmentType) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: position.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const nav = position.estimatedNav || position.nav || 0;
  const currentValue = position.shares * nav;
  const totalCost = position.total_buy;
  const profit = currentValue - totalCost;
  const profitPercent = totalCost > 0 ? (profit / totalCost) * 100 : 0;

  return (
    <div ref={setNodeRef} style={style} className="bg-gradient-to-br from-[#0d0d15] to-[#12121a] border border-[#2a2a3a] hover:border-[#00ffff] transition-all duration-300">
      {/* 卡片内容 */}
      <div className="p-4">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1a1a25] border border-[#00ffff] rounded flex items-center justify-center">
              <svg className="w-4 h-4 text-[#00ffff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <Link href={`/fund/${position.code}`} className="font-medium text-[#e0e0e0] hover:text-[#00ffff] transition-colors">
                {position.name}
              </Link>
              <div className="text-xs text-gray-500">{position.code}</div>
            </div>
          </div>
          {/* 拖拽手柄 */}
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-gray-500 hover:text-[#00ffff]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </div>
        </div>

        {/* 数据网格 */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <div className="text-xs text-gray-500">持有份额</div>
            <div className="text-sm text-[#e0e0e0]">{numeral(position.shares).format('0,0.00')}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">成本价</div>
            <div className="text-sm text-[#e0e0e0]">{numeral(position.avg_cost).format('0.0000')}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">当前净值</div>
            <div className="text-sm text-[#e0e0e0]">{numeral(nav).format('0.0000')}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">持仓市值</div>
            <div className="text-sm text-[#00ffff]">{numeral(currentValue).format('0,0.00')}</div>
          </div>
          <div className="col-span-2">
            <div className="text-xs text-gray-500">收益率</div>
            <div className={`text-lg font-semibold ${profitPercent >= 0 ? 'text-[#00ffff]' : 'text-[#ff3333]'}`}>
              {profitPercent >= 0 ? '+' : ''}{numeral(profitPercent).format('0.00')}%
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2 pt-3 border-t border-[#2a2a3a]">
          <button onClick={() => onViewHistory(position.code, position.name, position.type)} className="flex-1 py-2 text-xs text-gray-400 hover:text-[#ffff00] hover:bg-[#1a1a25] rounded transition-colors flex items-center justify-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            记录
          </button>
          <button onClick={() => onAddPosition(position.code, position.name, position.type)} className="flex-1 py-2 text-xs text-gray-400 hover:text-[#00ffff] hover:bg-[#1a1a25] rounded transition-colors flex items-center justify-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            加减仓
          </button>
          <button onClick={() => onDelete(position.id, position.name)} className="flex-1 py-2 text-xs text-gray-400 hover:text-[#ff3333] hover:bg-[#1a1a25] rounded transition-colors flex items-center justify-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            删除
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: 创建 StockCard 组件**

类似地创建 StockCard 组件，使用橙色主题 `#ff9500`。

**Step 3: 修改基金板块渲染**

将原来的:
```tsx
<div className="divide-y divide-[#2a2a3a]/50">
  {funds.map((position) => (...))}
</div>
```

改为:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-4">
  {funds.map((position) => (
    <FundCard key={position.id} position={position} ... />
  ))}
</div>
```

**Step 4: 修改股票板块渲染**

同样方式修改股票板块。

**Step 5: 保留 DnD 功能**

确保 DndContext 和 SortableContext 正确包装卡片组件。

---

### 任务 3: 验证功能

**验证方法:**
1. 打开 http://localhost:3000
2. 检查基金以卡片网格显示
3. 检查股票以卡片网格显示
4. 测试响应式布局（调整浏览器宽度）
5. 测试添加基金/股票
6. 测试加减仓
7. 测试交易记录
8. 测试删除
9. 测试拖拽排序

---

### 任务 4: 提交代码

```bash
git add src/app/\(dashboard\)/page.tsx TEST_CASES.md docs/plans/
git commit -m "refactor: convert list to card layout for fund and stock display"
```
