# Loading 和 Toast 交互优化设计

**Date:** 2026-02-19
**Status:** Draft

## 背景

当前项目存在的问题：
1. 网络请求没有明显的 loading 状态，用户感知不明显
2. 错误没有 toast 提醒，用户不知道操作是否失败

## 目标

- 实现操作级加载指示器（用户主动操作时显示）
- 使用现有 Toast 库显示错误提醒
- 优先实现 Loading，再实现 Toast

## 方案选择

**采用方案 C：自定义 useApi hook + sonner toast 库**

理由：
- Loading 只需在操作级显示，适合用 hook 封装
- sonner 是轻量级、高性能的 toast 库，UI 美观
- 两者结合可以通过一个 hook 统一处理

## 设计

### 1. 依赖安装

使用 `sonner` 作为 Toast 库（比 react-hot-toast 更轻量、TypeScript 支持更好）：

```bash
npm install sonner
```

### 2. 创建 useApi Hook

**文件：** `src/lib/hooks/useApi.ts`

```typescript
'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface UseApiOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  showLoadingToast?: boolean;
  loadingMessage?: string;
}

export function useApi<T>(
  apiFn: (...args: any[]) => Promise<{ data?: T; error?: Error; success: boolean }>,
  options?: UseApiOptions<T>
) {
  const [loading, setLoading] = useState(false);

  const execute = useCallback(async (...args: any[]) => {
    setLoading(true);
    const loadingId = options?.showLoadingToast
      ? toast.loading(options.loadingMessage || '加载中...')
      : null;

    try {
      const result = await apiFn(...args);

      if (loadingId) toast.dismiss(loadingId);

      if (result.success) {
        options?.onSuccess?.(result.data as T);
      } else {
        const errorMsg = result.error?.message || '操作失败';
        toast.error(errorMsg);
        options?.onError?.(result.error as Error);
      }

      return result;
    } catch (error) {
      if (loadingId) toast.dismiss(loadingId);
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

### 3. 使用示例

**Dashboard 页面添加持仓：**

```typescript
import { useApi } from '@/lib/hooks/useApi';

const { loading: adding, execute: addPosition } = useApi(
  (position: Position) => apiClient.post('/user-funds', position),
  {
    onSuccess: () => {
      toast.success('添加成功');
      fetchPositions();
    },
  }
);

// 按钮使用
<button
  onClick={() => addPosition(newPosition)}
  disabled={adding}
>
  {adding ? '添加中...' : '添加'}
</button>
```

### 4. 组件级 Loading 指示器

对于需要显示 loading 状态的按钮或区域，提供一个 LoadingSpinner 组件：

**文件：** `src/components/ui/LoadingButton.tsx`

```typescript
interface LoadingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children: React.ReactNode;
}

export function LoadingButton({ loading, children, disabled, ...props }: LoadingButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={/* 现有样式 + disabled 状态 */}
    >
      {loading && <Spinner className="mr-2" />}
      {children}
    </button>
  );
}
```

## 实现步骤

### 阶段 1: Loading 指示器
1. 安装 sonner 依赖
2. 创建 `src/lib/hooks/useApi.ts`
3. 创建 LoadingButton 组件
4. 改造 Dashboard 页面使用新 hook

### 阶段 2: Toast 错误提醒
1. 在 useApi hook 中集成 toast.error
2. 在 API 错误拦截器中也可以添加全局 toast
3. 验证错误场景的 toast 显示

## 验收标准

- [ ] 点击添加/删除持仓按钮显示 loading 状态
- [ ] 操作失败时显示红色错误 toast
- [ ] Loading 状态不会同时触发多个
- [ ] 不影响现有功能

## 风险与限制

- 需要改动多个组件的调用方式
- Loading 状态是操作级，不是页面级
