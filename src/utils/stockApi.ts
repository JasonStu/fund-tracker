// src/utils/stockApi.ts

// 东方财富API速率限制：每分钟约20次请求
// 使用信号量控制请求频率
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 3000; // 每次请求间隔3秒，确保每分钟不超过20次
const REQUEST_DELAY_BETWEEN_BATCH = 100; // 批量请求间隔

// 全局限流锁
let rateLimitLock = false;

/**
 * 获取股票价格（带速率限制）
 * 东方财富限制：每分钟约20次请求
 */
export async function getStockPrice(code: string): Promise<number | null> {
  // 等待锁释放
  while (rateLimitLock) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // 速率限制：确保请求间隔
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();

  return fetchStockPrice(code);
}

/**
 * 批量获取股票价格（推荐使用）
 * 内部已做好速率限制
 */
export async function getStockPrices(codes: string[]): Promise<Map<string, number>> {
  const results = new Map<string, number>();

  // 使用锁防止并发
  rateLimitLock = true;

  for (const code of codes) {
    const price = await fetchStockPrice(code);
    if (price !== null) {
      results.set(code, price);
    }

    // 除了最后一个，每次请求后等待
    if (codes.length > 1) {
      await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL));
    }
  }

  rateLimitLock = false;
  return results;
}

// 实际获取价格的函数
async function fetchStockPrice(code: string): Promise<number | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const secId = getSecId(code);
    const response = await fetch(
      `https://push2.eastmoney.com/api/qt/stock/get?secid=${secId}&fields=f43,f44,f45,f46,f47,f48,f49,f50,f51,f52,f57,f58,f59,f60,f169,f170,f171`,
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://quote.eastmoney.com/',
          'Accept': '*/*',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
      }
    );
    clearTimeout(timeoutId);

    // 处理500错误
    if (response.status === 500 || response.status === 502 || response.status === 503) {
      console.warn(`东方财富API返回${response.status}，可能被限流`);
      return null;
    }

    if (!response.ok) {
      console.error('获取股票价格失败:', response.status);
      return null;
    }

    const data = await response.json();

    // 检查API返回错误
    if (data.rc && data.rc !== 0) {
      console.error('东方财富API返回错误:', data);
      return null;
    }

    // 检查是否返回有效数据
    if (!data.data || data.data.f43 === undefined || data.data.f43 === null) {
      console.error('无效的股票数据:', data);
      return null;
    }

    return data.data.f43 / 100;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn(`获取 ${code} 股票价格超时`);
    } else {
      console.error('获取股票价格失败:', error);
    }
    return null;
  }
}

function getSecId(code: string): string {
  // 沪市: 1.0, 深市: 0.0, 创业板: 0.3, 科创板: 1.688
  if (code.startsWith('6') || code.startsWith('5') || code.startsWith('688')) {
    return `1.${code}`;
  }
  return `0.${code}`;
}
