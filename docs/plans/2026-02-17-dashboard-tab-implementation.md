# 仪表盘 Tab 切换实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 将仪表盘的基金和股票左右布局改为 Tab 切换显示

**Architecture:** 使用 React useState 控制 Tab 状态，点击切换时条件渲染对应模块内容

**Tech Stack:** Next.js 16, React 19, Tailwind CSS 4

---

## 实现步骤

### Task 1: 添加 Tab 状态

**Files:**
- Modify: `src/app/(dashboard)/page.tsx:1-50`

**Step 1: 添加 useState 导入**

在文件顶部的 import 区域添加 useState（如果还没有）。

**Step 2: 添加 activeTab 状态**

在 DashboardContent 组件开头（约 line 520）添加：
```tsx
const [activeTab, setActiveTab] = useState<'fund' | 'stock'>('fund');
```

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/page.tsx
git commit -m "feat(ui): 添加 Tab 切换状态"
```

---

### Task 2: 创建 TabSwitcher 组件

**Files:**
- Modify: `src/app/(dashboard)/page.tsx:100-200` (在现有组件区域添加)

**Step 1: 添加 TabSwitcher 组件函数**

在 PortfolioOverview 组件后面添加：
```tsx
function TabSwitcher({
  activeTab,
  onTabChange,
  fundCount,
  stockCount,
}: {
  activeTab: 'fund' | 'stock';
  onTabChange: (tab: 'fund' | 'stock') => void;
  fundCount: number;
  stockCount: number;
}) {
  return (
    <div className="flex items-center gap-1 px-6 py-3 bg-[#12121a] border-b border-[#2a2a3a]">
      {/* 基金 Tab */}
      <button
        onClick={() => onTabChange('fund')}
        className={`relative px-4 py-2 font-medium text-base transition-colors duration-200 ${
          activeTab === 'fund' ? 'text-[#00ffff]' : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <div className="flex items-center gap-2">
          <svg className={`w-4 h-4 ${activeTab === 'fund' ? 'text-[#00ffff]' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>基金</span>
          <span className="text-xs text-gray-500">({fundCount})</span>
        </div>
        {activeTab === 'fund' && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00ffff]" />
        )}
      </button>

      {/* 股票 Tab */}
      <button
        onClick={() => onTabChange('stock')}
        className={`relative px-4 py-2 font-medium text-base transition-colors duration-200 ${
          activeTab === 'stock' ? 'text-[#ff9500]' : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <div className="flex items-center gap-2">
          <svg className={`w-4 h-4 ${activeTab === 'stock' ? 'text-[#ff9500]' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span>股票</span>
          <span className="text-xs text-gray-500">({stockCount})</span>
        </div>
        {activeTab === 'stock' && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff9500]" />
        )}
      </button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/\(dashboard\)/page.tsx
git commit -m "feat(ui): 添加 TabSwitcher 组件"
```

---

### Task 3: 替换左右布局为 Tab 切换

**Files:**
- Modify: `src/app/(dashboard)/page.tsx:690-800`

**Step 1: 找到并替换布局代码**

找到当前的左右分栏代码（约 line 690-770）：
```tsx
{/* 左右分栏布局 */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* 左侧：基金板块 */}
  <div>...</div>
  {/* 右侧：股票板块 */}
  <div>...</div>
</div>
```

替换为：
```tsx
{/* Tab 切换器 */}
<TabSwitcher
  activeTab={activeTab}
  onTabChange={setActiveTab}
  fundCount={funds.length}
  stockCount={stocks.length}
/>

{/* Tab 内容区域 */}
<div className="p-4">
  {activeTab === 'fund' ? (
    <div className={`transition-opacity duration-150 ${activeTab === 'fund' ? 'opacity-100' : 'opacity-0'}`}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(e) => handleDragEnd(e, 'fund')}
      >
        <SortableContext
          items={funds.map(p => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {funds.length === 0 ? (
            <EmptyState type="fund" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {funds.map((position) => (
                <FundCard
                  key={position.id}
                  position={position}
                  onAddPosition={handleAddPosition}
                  onDelete={requestDeletePosition}
                  onViewHistory={handleViewHistory}
                />
              ))}
            </div>
          )}
        </SortableContext>
      </DndContext>
    </div>
  ) : (
    <div className={`transition-opacity duration-150 ${activeTab === 'stock' ? 'opacity-100' : 'opacity-0'}`}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={(e) => handleDragEnd(e, 'stock')}
      >
        <SortableContext
          items={stocks.map(p => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {stocks.length === 0 ? (
            <EmptyState type="stock" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {stocks.map((position) => (
                <StockCard
                  key={position.id}
                  position={position}
                  onAddPosition={handleAddPosition}
                  onDelete={requestDeletePosition}
                  onViewHistory={handleViewHistory}
                />
              ))}
            </div>
          )}
        </SortableContext>
      </DndContext>
    </div>
  )}
</div>
```

**Step 2: 简化外层容器**

找到并删除外层的 `grid grid-cols-1 lg:grid-cols-2 gap-6` 包装，直接使用新的 Tab 组件和内容区域。

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/page.tsx
git commit -m "feat(ui): 将左右布局改为Tab切换显示"
```

---

### Task 4: 验证和测试

**Files:**
- 测试: `http://localhost:3000`

**Step 1: 启动开发服务器（如未运行）**

```bash
npm run dev
```

**Step 2: 浏览器测试**

1. 访问 http://localhost:3000
2. 验证 Tab 切换器显示正确
3. 点击"基金"Tab 显示基金卡片
4. 点击"股票"Tab 显示股票卡片
5. 验证响应式布局（缩放浏览器窗口）

**Step 3: Commit**

```bash
git commit -m "test: 验证Tab切换功能正常"
```

---

### Task 5: 更新测试用例文档

**Files:**
- Modify: `TEST_CASES.md`

**Step 1: 添加 Tab 切换测试用例**

在 TEST_CASES.md 中添加：
```markdown
### TC018: Tab 切换显示
**步骤:**
1. 进入仪表盘页面
2. 点击"股票"Tab

**预期结果:**
- 基金模块隐藏
- 股票模块显示
- Tab 高亮切换到股票

**验证方法:**
- [ ] 点击Tab后内容切换
- [ ] 选中Tab颜色高亮
- [ ] 响应式布局正常
```

**Step 2: Commit**

```bash
git add TEST_CASES.md
git commit -m "docs: 添加Tab切换测试用例"
```
