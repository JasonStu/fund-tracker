# 网络层重构实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 建立健壮的网络层架构，包含统一响应类型、错误处理、外部API集中管理

**Architecture:**
- 创建 `src/lib/api/` 目录存放核心 API 组件
- 创建 `src/config/externalApis.ts` 集中管理外部 API 配置
- 增强 `apiClient` 支持错误处理统一和响应类型
- 保留服务层作为可选调用方式

**Tech Stack:**
- axios（现有）
- TypeScript 类型系统
- 无需新增依赖

---

## 阶段一：创建基础类型和错误定义

### Task 1: 创建 API 响应类型

**Files:**
- Create: `src/lib/api/types.ts`

**Step 1: 创建文件**

```typescript
// src/lib/api/types.ts

// API 响应包装类型
export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  success: boolean;
}

// 分页响应
export interface PaginatedApiResponse<T> extends ApiResponse<T> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
}

// 请求配置
export interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}
```

**Step 2: Commit**

```bash
git add src/lib/api/types.ts
git commit -m "feat(api): 添加API响应类型定义"
```

---

### Task 2: 创建统一错误类型

**Files:**
- Create: `src/lib/api/errors.ts`

**Step 1: 创建文件**

```typescript
// src/lib/api/errors.ts

export class ApiError extends Error {
  constructor(
    public code: string,
    public message: string,
    public status: number,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const ErrorCodes = {
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
} as const;
```

**Step 2: Commit**

```bash
git add src/lib/api/errors.ts
git commit -m "feat(api): 添加统一错误类型"
```

---

## 阶段二：创建外部 API 客户端

### Task 3: 创建外部 API 配置

**Files:**
- Create: `src/config/externalApis.ts`

**Step 1: 创建文件**

```typescript
// src/config/externalApis.ts

export interface ExternalApiConfig {
  baseUrl: string;
  timeout: number;
  headers?: Record<string, string>;
}

export const externalApis = {
  eastMoney: {
    baseUrl: 'http://fundf10.eastmoney.com',
    timeout: 10000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    },
  },
  sinaStocks: {
    baseUrl: 'https://hq.sinajs.cn',
    timeout: 5000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Referer': 'https://finance.sina.com.cn/',
    },
  },
  fundGZ: {
    baseUrl: 'http://fundgz.1234567.com.cn',
    timeout: 5000,
  },
  feishu: {
    baseUrl: 'https://open.feishu.cn/open-apis',
    timeout: 15000,
  },
} as const;

export type ExternalApiName = keyof typeof externalApis;
```

**Step 2: Commit**

```bash
git add src/config/externalApis.ts
git commit -m "feat(config): 添加外部API配置"
```

---

### Task 4: 创建外部 API 客户端工厂

**Files:**
- Create: `src/lib/api/externalClient.ts`

**Step 1: 创建文件**

```typescript
// src/lib/api/externalClient.ts

import axios, { AxiosInstance } from 'axios';
import { externalApis, ExternalApiName } from '@/config/externalApis';

export function createExternalClient(name: ExternalApiName): AxiosInstance {
  const config = externalApis[name];
  return axios.create({
    baseURL: config.baseUrl,
    timeout: config.timeout,
    headers: config.headers,
  });
}
```

**Step 2: Commit**

```bash
git add src/lib/api/externalClient.ts
git commit -m "feat(api): 添加外部API客户端工厂"
```

---

## 阶段三：增强 API 客户端

### Task 5: 创建增强版 API 客户端

**Files:**
- Create: `src/lib/api/client.ts`

**Step 1: 创建文件**

```typescript
// src/lib/api/client.ts

import axios, { AxiosInstance, AxiosError } from 'axios';
import { ApiResponse, RequestConfig } from './types';
import { ApiError, ErrorCodes } from './errors';

class ApiClient {
  private client: AxiosInstance;
  private static instance: ApiClient;

  private constructor() {
    this.client = axios.create({
      baseURL: '/api',
      timeout: 10000,
    });
    this.setupInterceptors();
  }

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  private setupInterceptors(): void {
    // 请求拦截器
    this.client.interceptors.request.use(
      (config) => {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          if (typeof window !== 'undefined') {
            window.location.href = '/login?expired=true';
          }
        }
        return Promise.reject(this.transformError(error));
      }
    );
  }

  private transformError(error: AxiosError): ApiError {
    const response = error.response;
    if (response) {
      const data = response.data as any;
      return new ApiError(
        data?.code || ErrorCodes.INTERNAL_ERROR,
        data?.message || error.message,
        response.status,
        data?.details
      );
    }
    if (error.code === 'ECONNABORTED') {
      return new ApiError(ErrorCodes.TIMEOUT, '请求超时', 408);
    }
    return new ApiError(ErrorCodes.NETWORK_ERROR, '网络连接失败', 0);
  }

  async get<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get<T>(url, { timeout: config?.timeout });
      return { data: response.data, success: true };
    } catch (error) {
      return { error: error as ApiError, success: false };
    }
  }

  async post<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post<T>(url, data, { timeout: config?.timeout });
      return { data: response.data, success: true };
    } catch (error) {
      return { error: error as ApiError, success: false };
    }
  }

  async put<T>(url: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.put<T>(url, data, { timeout: config?.timeout });
      return { data: response.data, success: true };
    } catch (error) {
      return { error: error as ApiError, success: false };
    }
  }

  async delete<T>(url: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.delete<T>(url, { timeout: config?.timeout });
      return { data: response.data, success: true };
    } catch (error) {
      return { error: error as ApiError, success: false };
    }
  }
}

export const apiClient = ApiClient.getInstance();
```

**Step 2: Commit**

```bash
git add src/lib/api/client.ts
git commit -m "feat(api): 创建增强版API客户端"
```

---

## 阶段四：更新现有代码使用新架构

### Task 6: 更新 dashboard page 使用新客户端

**Files:**
- Modify: `src/app/(dashboard)/page.tsx`

**Step 1: 更新导入**

```typescript
// 替换
import { apiClient } from '@/utils/api';

// 为
import { apiClient } from '@/lib/api/client';
```

**Step 2: 运行 lint 检查**

```bash
npm run lint
```

**Step 3: Commit**

```bash
git add src/app/(dashboard)/page.tsx
git commit -m "refactor(api): 更新dashboard使用新的API客户端"
```

---

### Task 7: 迁移 fundService 使用外部客户端

**Files:**
- Modify: `src/services/fundService.ts`

**Step 1: 更新代码使用 createExternalClient**

```typescript
import { createExternalClient } from '@/lib/api/externalClient';

const eastMoneyClient = createExternalClient('eastMoney');
```

**Step 2: Commit**

```bash
git add src/services/fundService.ts
git commit -m "refactor(api): fundService迁移使用外部客户端"
```

---

### Task 8: 迁移 stockService 使用外部客户端

**Files:**
- Modify: `src/services/stockService.ts`

**Step 1: 更新代码使用 createExternalClient**

```typescript
import { createExternalClient } from '@/lib/api/externalClient';

const sinaClient = createExternalClient('sinaStocks');
```

**Step 2: Commit**

```bash
git add src/services/stockService.ts
git commit -m "refactor(api): stockService迁移使用外部客户端"
```

---

### Task 9: 迁移 feishuService 使用外部客户端

**Files:**
- Modify: `src/services/feishuService.ts`

**Step 1: 更新代码使用 createExternalClient**

```typescript
import { createExternalClient } from '@/lib/api/externalClient';

const feishuClient = createExternalClient('feishu');
```

**Step 2: Commit**

```bash
git add src/services/feishuService.ts
git commit -m "refactor(api): feishuService迁移使用外部客户端"
```

---

### Task 10: 清理旧 API 工具函数

**Files:**
- Modify: `src/utils/api.ts`

**Step 1: 保留兼容函数，移除 apiClient**

```typescript
// 移除 apiClient 和拦截器
// 保留 fetchWithGBK, fetchJson, getStockMarketCode
```

**Step 2: Commit**

```bash
git add src/utils/api.ts
git commit -m "refactor(api): 清理旧的apiClient，保留工具函数"
```

---

## 阶段五：创建服务层（可选）

### Task 11: 创建用户基金服务

**Files:**
- Create: `src/services/userFundService.ts`

**Step 1: 创建服务**

```typescript
import { apiClient, ApiResponse } from '@/lib/api/client';
import { Position, Transaction } from '@/types';

export const userFundService = {
  async getPositions(): Promise<ApiResponse<{ positions: Position[]; transactions: Transaction[] }>> {
    return apiClient.get('/user-funds');
  },
  async addFund(params: { fund_code: string; fund_name: string; shares: number; cost: number }) {
    return apiClient.post('/user-funds', params);
  },
  async deleteFund(id: string) {
    return apiClient.delete(`/user-funds/positions/${id}`);
  },
  async updateSortOrder(items: Array<{ id: string; sort_order: number }>) {
    return apiClient.put('/user-funds/sort', items);
  },
  async addTransaction(params: { fund_id: string; type: 'buy' | 'sell'; shares: number; price: number; notes?: string }) {
    return apiClient.post('/user-funds/transactions', params);
  },
};
```

**Step 2: Commit**

```bash
git add src/services/userFundService.ts
git commit -m "feat(service): 创建用户基金服务"
```

---

## 计划完成

**Plan complete and saved to `docs/plans/2026-02-17-network-architecture-plan.md`.**

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?
