// src/lib/api/types.ts

import { ApiError } from "./errors";

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
