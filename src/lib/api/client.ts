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
        return Promise.reject(this.transformError(error as AxiosError<{ code?: string; message?: string; details?: Record<string, unknown> }>));
      }
    );
  }

  private transformError(error: AxiosError<{ code?: string; message?: string; details?: Record<string, unknown> }>): ApiError {
    const response = error.response;
    if (response) {
      const data = response.data;
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

  async post<T>(url: string, data?: Record<string, unknown>, config?: RequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post<T>(url, data, { timeout: config?.timeout });
      return { data: response.data, success: true };
    } catch (error) {
      return { error: error as ApiError, success: false };
    }
  }

  async put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<ApiResponse<T>> {
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
