# 网络层架构设计文档

## 1. 概述

本文档描述 fund-tracker 项目网络层的重构设计，旨在建立一个健壮、可维护、可扩展的 API 通信架构。

## 2. 当前问题

| 问题 | 影响 |
|------|------|
| API 客户端功能单一，只有 401 处理 | 缺少重试、日志、错误转换 |
| 服务层未被前端使用 | 代码重复，难以维护 |
| 错误处理不一致 | 调试困难，行为不可预测 |
| 外部 API 分散 | 配置重复，难以管理 |
| 缺少统一响应类型 | 类型安全不足 |

## 3. 设计目标

- ✅ 统一的 API 客户端（认证、重试、日志、错误处理）
- ✅ 统一错误类型和错误码
- ✅ 外部 API 集中管理
- ✅ 支持请求取消和超时
- ✅ 前后端调用一致性

## 4. 架构设计

```
src/
├── lib/
│   └── api/
│       ├── client.ts          # API 客户端（增强版）
│       ├── errors.ts          # 统一错误类型
│       ├── types.ts           # 统一响应类型
│       └── externalClient.ts  # 外部 API 客户端
├── config/
│   └── externalApis.ts        # 外部 API 配置
├── services/
│   ├── userFundService.ts     # 用户基金服务
│   ├── fundService.ts         # 基金数据服务
│   └── ...
├── utils/
│   └── api.ts                 # 保留兼容工具函数
└── app/
    └── (dashboard)/
        └── page.tsx           # 使用服务层或增强版客户端
```

## 5. 核心组件设计

### 5.1 统一响应类型

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

### 5.2 统一错误类型

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

// 错误码定义
export const ErrorCodes = {
  // 认证错误 (401)
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_INVALID_TOKEN: 'AUTH_INVALID_TOKEN',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',

  // 客户端错误 (400-499)
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',

  // 服务端错误 (500+)
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',

  // 网络错误
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
} as const;
```

### 5.3 增强版 API 客户端

```typescript
// src/lib/api/client.ts

import axios, { AxiosInstance, AxiosError } from 'axios';
import { ApiResponse, ApiError, ErrorCodes } from './errors';

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
        // 添加认证 token（由 Supabase 自动处理）
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 响应拦截器
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        // 401 处理
        if (error.response?.status === 401) {
          if (typeof window !== 'undefined') {
            window.location.href = '/login?expired=true';
          }
        }

        // 转换为统一错误类型
        const apiError = this.transformError(error);
        return Promise.reject(apiError);
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

    // 网络错误
    if (error.code === 'ECONNABORTED') {
      return new ApiError(ErrorCodes.TIMEOUT, '请求超时', 408);
    }

    return new ApiError(
      ErrorCodes.NETWORK_ERROR,
      '网络连接失败',
      0
    );
  }

  // 统一请求方法
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

### 5.4 外部 API 客户端

```typescript
// src/lib/api/externalClient.ts

import axios, { AxiosInstance } from 'axios';

// 外部 API 配置
export interface ExternalApiConfig {
  baseUrl: string;
  timeout: number;
  headers?: Record<string, string>;
  retry?: {
    maxAttempts: number;
    delay: number;
  };
}

// 外部 API 配置定义
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

export function createExternalClient(name: ExternalApiName): AxiosInstance {
  const config = externalApis[name];
  return axios.create({
    baseURL: config.baseUrl,
    timeout: config.timeout,
    headers: config.headers,
  });
}
```

## 6. 服务层设计

### 6.1 用户基金服务

```typescript
// src/services/userFundService.ts

import { apiClient, ApiResponse } from '@/lib/api/client';
import { Position, Transaction } from '@/types';

export const userFundService = {
  async getPositions(): Promise<ApiResponse<{ positions: Position[]; transactions: Transaction[] }>> {
    return apiClient.get('/user-funds');
  },

  async addFund(params: {
    fund_code: string;
    fund_name: string;
    shares: number;
    cost: number;
  }): Promise<ApiResponse<any>> {
    return apiClient.post('/user-funds', params);
  },

  async deleteFund(id: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/user-funds/positions/${id}`);
  },

  async updateSortOrder(items: Array<{ id: string; sort_order: number }>): Promise<ApiResponse<void>> {
    return apiClient.put('/user-funds/sort', items);
  },

  async addTransaction(params: {
    fund_id: string;
    type: 'buy' | 'sell';
    shares: number;
    price: number;
    notes?: string;
  }): Promise<ApiResponse<Transaction>> {
    return apiClient.post('/user-funds/transactions', params);
  },
};
```

## 7. 使用示例

### 7.1 增强版客户端直接调用

```typescript
// 在组件中使用
import { apiClient } from '@/lib/api/client';

async function loadPositions() {
  const result = await apiClient.get('/user-funds');

  if (result.success && result.data) {
    setPositions(result.data.positions);
  } else {
    console.error('Failed to load:', result.error?.message);
    showToast('加载失败');
  }
}
```

### 7.2 服务层调用

```typescript
// 在组件中使用服务层
import { userFundService } from '@/services/userFundService';

async function loadPositions() {
  const result = await userFundService.getPositions();

  if (result.success && result.data) {
    setPositions(result.data.positions);
  } else {
    console.error('Failed to load:', result.error?.message);
  }
}
```

## 8. 错误处理策略

| 错误类型 | 处理方式 |
|----------|----------|
| 401 (认证过期) | 自动跳转到登录页 |
| 400 (参数错误) | 显示具体错误信息 |
| 404 (资源不存在) | 显示"未找到"提示 |
| 500 (服务端错误) | 显示"服务异常"，可重试 |
| 网络超时 | 显示"网络异常"，可重试 |

## 9. 后续改进

- [ ] 添加请求日志记录
- [ ] 添加请求缓存
- [ ] 添加 API 版本管理
- [ ] 添加请求队列管理
