import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'code is required' }, { status: 400 });
  }

  try {
    let market = '';
    if (code.startsWith('6')) {
      market = '1.' + code;
    } else if (code.startsWith('0') || code.startsWith('3')) {
      market = '0.' + code;
    }

    const url = `https://push2.eastmoney.com/api/qt/stock/fflow/daykline/get`;
    const response = await axios.get(url, {
      params: {
        secid: market,
        fields1: 'f1,f2,f3,f7',
        fields2: 'f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61,f62,f63,f64,f65',
        ltType: 1,
        heType: 1,
        klt: 1,
        beg: 0,
        end: 30,
      },
      timeout: 10000,
    });

    const data = response.data;
    if (!data.data || !data.data.klines) {
      return NextResponse.json({ moneyflow: [] });
    }

    const klines = data.data.klines;
    const moneyflow = klines.map((line: string) => {
      const parts = line.split(',');
      return {
        date: parts[0],
        mainInflow: parseFloat(parts[1]) || 0,
        mainOutflow: parseFloat(parts[2]) || 0,
        mainNetInflow: parseFloat(parts[3]) || 0,
        retailInflow: parseFloat(parts[4]) || 0,
        retailOutflow: parseFloat(parts[5]) || 0,
        retailNetInflow: parseFloat(parts[6]) || 0,
      };
    });

    return NextResponse.json({ moneyflow });
  } catch (error) {
    console.error('Fetch moneyflow failed:', error);
    return NextResponse.json({ error: 'Failed to fetch moneyflow data' }, { status: 500 });
  }
}
