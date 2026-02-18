import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  }

  // 转换市场代码
  let market = '';
  if (code.startsWith('6')) {
    market = '1'; // 上海
  } else if (code.startsWith('0') || code.startsWith('3')) {
    market = '0'; // 深圳
  }

  try {
    // 东方财富 K线 API
    const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?` +
      `secid=${market}.${code}&` +
      `fields1=f1,f2,f3,f4,f5,f6&` +
      `fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&` +
      `klt=101&` + // 日K
      `fqt=1&` +
      `end=20500101&` +
      `lmt=500`;

    const response = await axios.get(url, { timeout: 10000 });
    const data = response.data;

    if (data.data?.klines) {
      const klines = data.data.klines.map((line: string) => {
        const parts = line.split(',');
        return {
          date: parts[0],
          open: parseFloat(parts[1]),
          close: parseFloat(parts[2]),
          high: parseFloat(parts[3]),
          low: parseFloat(parts[4]),
          volume: parseFloat(parts[5]),
          amount: parseFloat(parts[6]),
        };
      });

      return NextResponse.json({ klines });
    }

    return NextResponse.json({ klines: [] });
  } catch (error) {
    console.error('Kline API error:', error);
    return NextResponse.json({ error: 'Failed to fetch kline' }, { status: 500 });
  }
}
