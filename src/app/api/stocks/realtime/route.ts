import { NextRequest, NextResponse } from 'next/server';
import { getRealtimeStocks } from '@/services/stockService';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const codes = searchParams.get('codes');

  if (!codes) {
    return NextResponse.json({ stocks: [] });
  }

  try {
    const stockList = codes.split(',');
    const stocks = await getRealtimeStocks(stockList);
    return NextResponse.json({ stocks });
  } catch (error) {
    console.error('Stock API Error:', error);
    return NextResponse.json({ error: 'Failed to fetch stock data' }, { status: 500 });
  }
}
