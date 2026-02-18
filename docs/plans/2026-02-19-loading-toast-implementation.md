# Loading 和 Toast 交互优化实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 实现操作级 loading 指示器和错误 toast 提醒

**Architecture:** 使用自定义 useApi hook 封装网络请求，结合 sonner toast 库显示状态

**Tech Stack:** React Hooks, sonner (Toast 库)

---

## 阶段 1: Loading 指示器

### Task 1: 安装 sonner 依赖

**Files:**
- Modify: `package.json`

**Step 1: 安装依赖**

Run: `npm install sonner`
Expected: 安装成功，package.json 中添加 sonner 依赖

**Step 2: Commit**

```bash
npm install sonner && npm run lint -- --fix
git add package.json package-lock.json
git commit -m "feat: 安装 sonner toast 库"
```

---

### Task 2: 创建 useApi Hook

**Files:**
- Create: `src/lib/hooks/useApi.ts`

**Step 1: 创建 useApi.ts 文件**

```typescript
'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface UseApiOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface ApiResult<T> {
  data?: T;
  error?: Error;
  success: boolean;
}

export function useApi<T, Args extends unknown[]>(
  apiFn: (...args: Args) => Promise<ApiResult<T>>,
  options?: UseApiOptions<T>
) {
  const [loading, setLoading] = useState(false);

  const execute = useCallback(async (...args: Args) => {
    setLoading(true);

    try {
      const result = await apiFn(...args);

      if (result.success) {
        options?.onSuccess?.(result.data as T);
      } else {
        const errorMsg = result.error?.message || '操作失败';
        toast.error(errorMsg);
        options?.onError?.(result.error as Error);
      }

      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      toast.error(errorMsg);
      options?.onError?.(error as Error);
      return { success: false, error: error as Error };
    } finally {
      setLoading(false);
    }
  }, [apiFn, options]);

  return { loading, execute };
}
```

**Step 2: Commit**

```bash
git add src/lib/hooks/useApi.ts
git commit -m "feat: 创建 useApi hook 封装网络请求"
```

---

### Task 3: 创建 LoadingSpinner 组件

**Files:**
- Create: `src/components/ui/LoadingSpinner.tsx`

**Step 1: 创建 LoadingSpinner 组件**

```typescript
interface LoadingSpinnerProps {
  className?: string;
}

export function LoadingSpinner({ className = '' }: LoadingSpinnerProps) {
  return (
    <svg
      className={`w-4 h-4 animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/ui/LoadingSpinner.tsx
git commit -m "feat: 创建 LoadingSpinner 组件"
```

---

### Task 4: 改造 Dashboard 添加持仓功能

**Files:**
- Modify: `src/app/(dashboard)/page.tsx:595-620`

**Step 1: 导入 useApi hook**

在文件顶部添加：
```typescript
import { useApi } from '@/lib/hooks/useApi';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
```

**Step 2: 改造添加持仓函数**

找到 `handleAddPosition` 函数（约 595 行），改造为：

```typescript
const { loading: addingPosition, execute: addPosition } = useApi(
  (position: Position) => apiClient.post('/user-funds', position),
  {
    onSuccess: () => {
      fetchPositions();
      setAddDialogOpen(false);
    },
  }
);

const handleAddPosition = async (position: Position) => {
  await addPosition(position);
};
```

**Step 3: 修改添加按钮显示 loading**

找到对话框中的确认按钮，添加 loading 状态显示：

```typescript
<Button
  onClick={() => handleAddPosition(newPosition)}
  disabled={addingPosition}
  className="..."
>
  {addingPosition && <LoadingSpinner className="mr-2" />}
  {addingPosition ? '添加中...' : '确认'}
</Button>
```

**Step 4: Commit**

```bash
git add src/app/\(dashboard\)/page.tsx
git commit -m "feat: 添加持仓显示 loading 状态"
```

---

### Task 5: 改造 Dashboard 删除持仓功能

**Files:**
- Modify: `src/app/(dashboard)/page.tsx:660`

**Step 1: 改造删除持仓函数**

找到删除相关的代码，添加 useApi：

```typescript
const { loading: deletingPosition, execute: deletePosition } = useApi(
  (id: string) => apiClient.delete(`/user-funds/positions/${id}`),
  {
    onSuccess: () => {
      fetchPositions();
    },
  }
);
```

**Step 2: 修改删除按钮显示 loading**

在删除确认对话框的确认按钮上添加 loading 状态。

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/page.tsx
git commit -m "feat: 删除持仓显示 loading 状态"
```

---

### Task 6: 改造 Dashboard 添加交易功能

**Files:**
- Modify: `src/app/(dashboard)/page.tsx:637`

**Step 1: 改造添加交易函数**

```typescript
const { loading: addingTransaction, execute: addTransaction } = useApi(
  (transaction: Transaction) => apiClient.post('/user-funds/transactions', transaction),
  {
    onSuccess: () => {
      fetchPositions();
      setTransactionDialogOpen(false);
    },
  }
);
```

**Step 2: 修改交易按钮显示 loading**

**Step 3: Commit**

```bash
git add src/app/\(dashboard\)/page.tsx
git commit -m "feat: 添加交易显示 loading 状态"
```

---

## 阶段 2: Toast 错误提醒

### Task 7: 集成全局 Toast Provider

**Files:**
- Modify: `src/app/layout.tsx`

**Step 1: 添加 Toaster 组件**

在 layout.tsx 的 body 中添加：

```typescript
import { Toaster } from 'sonner';

<body>
  {children}
  <Toaster position="top-center" richColors />
</body>
```

**Step 2: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat: 添加全局 Toast Provider"
```

---

### Task 8: 验证和测试

**Step 1: 运行开发服务器**

Run: `npm run dev`
Expected: 服务启动无报错

**Step 2: 测试添加持仓显示 loading**

1. 打开浏览器访问 http://localhost:3000
2. 点击添加持仓按钮
3. 验证按钮显示 "添加中..." 且按钮禁用

**Step 3: 测试错误 toast**

1. 模拟网络错误或输入错误数据
2. 验证页面右上角显示红色错误 toast

**Step 4: Commit**

```bash
git add -A
git commit -m "test: 验证 loading 和 toast 功能"
```

---

## 验收标准

- [ ] 点击添加持仓按钮显示 loading 状态
- [ ] 点击删除持仓按钮显示 loading 状态
- [ ] 点击添加交易按钮显示 loading 状态
- [ ] 操作失败时显示红色错误 toast
- [ ] Loading 状态不会同时触发多个（通过 disabled 防止）
- [ ] 不影响现有功能

## 风险与限制

- 需要改动多个组件的调用方式
- Loading 状态是操作级，不是页面级
