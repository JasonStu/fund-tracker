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
