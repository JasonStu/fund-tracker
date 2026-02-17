// src/lib/api/externalClient.ts

import axios, { AxiosInstance } from 'axios';
import { externalApis, ExternalApiName } from '@/config/externalApis';

export function createExternalClient(name: ExternalApiName): AxiosInstance {
  const config = externalApis[name] as { baseUrl: string; timeout: number; headers?: Record<string, string> };
  return axios.create({
    baseURL: config.baseUrl,
    timeout: config.timeout,
    headers: config.headers ?? {},
  });
}
