import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// 东方财富API速率限制
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 3000; // 每次请求间隔3秒

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const days = parseInt(searchParams.get('days') || '5', 10);

  if (!code) {
    return NextResponse.json({ error: 'code is required' }, { status: 400 });
  }

  try {
    // 速率限制
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
    }
    lastRequestTime = Date.now();

    let market = '';
    if (code.startsWith('6')) {
      market = '1.' + code;
    } else if (code.startsWith('0') || code.startsWith('3')) {
      market = '0.' + code;
    }

    // 东方财富分时K线 API
    const url = `http://push2his.eastmoney.com/api/qt/stock/kline/get`;
    const params = {
      secid: market,
      fields1: 'f1,f2,f3,f4,f5,f6',
      fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61',
      klt: 1,  // 分时
      fqt: 1,  // 前复权
      beg: days === 1 ? 0 : (0 - days),
      end: 20500101,
      lmt: 500,
    };

    const response = await axios.get(url, { params, timeout: 10000 });
    const data = response.data;

    if (!data.data || !data.data.klines) {
      return NextResponse.json({ intraday: [] });
    }

    const klines = data.data.klines;
    const intraday = klines.map((line: string) => {
      const parts = line.split(',');
      const dateTime = parts[0].split(' ');
      const volume = parseFloat(parts[5]);
      const amount = parseFloat(parts[6]);
      const avgPrice = volume > 0 ? amount / (volume * 100) : parseFloat(parts[1]);

      return {
        date: dateTime[0],
        time: dateTime[1] || '',
        close: parseFloat(parts[2]),
        volume: volume,
        avgPrice: avgPrice,
      };
    });

    return NextResponse.json({ intraday });
  } catch (error) {
    console.error('Fetch intraday failed:', error);
    return NextResponse.json({ error: 'Failed to fetch intraday data' }, { status: 500 });
  }
}
