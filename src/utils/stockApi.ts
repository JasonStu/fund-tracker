// src/utils/stockApi.ts
export async function getStockPrice(code: string): Promise<number> {
  try {
    const secId = getSecId(code);
    const response = await fetch(
      `https://push2.eastmoney.com/api/qt/stock/get?secid=${secId}&fields=f43,f44,f45,f46,f47,f48,f49,f50,f51,f52,f57,f58,f59,f60,f169,f170,f171`
    );
    const data = await response.json();
    return data.data?.f43 ? data.data.f43 / 100 : 0;
  } catch (error) {
    console.error('Failed to get stock price:', error);
    return 0;
  }
}

function getSecId(code: string): string {
  // 沪市: 1.0, 深市: 0.0, 创业板: 0.3, 科创板: 1.688
  if (code.startsWith('6') || code.startsWith('5') || code.startsWith('688')) {
    return `1.${code}`;
  }
  return `0.${code}`;
}
