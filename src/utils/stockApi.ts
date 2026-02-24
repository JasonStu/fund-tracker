// src/utils/stockApi.ts
export async function getStockPrice(code: string): Promise<number | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const secId = getSecId(code);
    const response = await fetch(
      `https://push2.eastmoney.com/api/qt/stock/get?secid=${secId}&fields=f43,f44,f45,f46,f47,f48,f49,f50,f51,f52,f57,f58,f59,f60,f169,f170,f171`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('获取股票价格失败:', response.status);
      return null;
    }

    const data = await response.json();

    // 检查是否返回有效数据
    if (!data.data || data.data.f43 === undefined || data.data.f43 === null) {
      console.error('无效的股票数据:', data);
      return null;
    }

    return data.data.f43 / 100;
  } catch (error: unknown) {
    clearTimeout(timeoutId);
    // 忽略 AbortError（超时）
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
