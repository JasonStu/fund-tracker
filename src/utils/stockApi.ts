// src/utils/stockApi.ts

// 腾讯API速率限制：无明显限制，但建议适当控制请求频率
// 使用信号量控制请求频率
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 500; // 每次请求间隔500ms
const REQUEST_DELAY_BETWEEN_BATCH = 100; // 批量请求间隔

// 全局限流锁
let rateLimitLock = false;

/**
 * 获取股票价格（带速率限制）
 * 腾讯API
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

// 实际获取价格的函数 - 腾讯API
async function fetchStockPrice(code: string): Promise<number | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const qCode = getTencentCode(code);
    const response = await fetch(
      `https://qt.gtimg.cn/q=${qCode}`,
      {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://finance.qq.com/',
          'Accept': '*/*',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        },
      }
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('获取股票价格失败:', response.status);
      return null;
    }

    const text = await response.text();

    // 检查是否返回有效数据
    if (!text || text.trim() === '' || text === 'null') {
      console.error('无效的股票数据:', text);
      return null;
    }

    // 腾讯API返回格式: v_sh600519="1~贵州茅台~600519~1491.66~1466.80~1470.00~..."
    // 字段说明: 索引3=当前价格, 索引4=昨收, 索引5=开盘
    const parts = text.match(/="([^"]+)"/);
    if (!parts || !parts[1]) {
      console.error('无法解析腾讯API返回数据:', text);
      return null;
    }

    const fields = parts[1].split('~');
    const price = parseFloat(fields[3]); // 索引3是当前价格

    if (isNaN(price) || price <= 0) {
      console.error('无效的股票价格:', fields[5], '原始数据:', text);
      return null;
    }

    return price;
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

function getTencentCode(code: string): string {
  // 沪市: sh + 股票代码
  if (code.startsWith('6') || code.startsWith('5') || code.startsWith('688')) {
    return `sh${code}`;
  }
  // 深市: sz + 股票代码
  return `sz${code}`;
}
