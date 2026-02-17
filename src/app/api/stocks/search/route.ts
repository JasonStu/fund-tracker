import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query || query.length < 1) {
    return NextResponse.json({ stocks: [] });
  }

  try {
    // 使用东方财富股票API
    const url = `https://search-api.eastmoney.com/api/json/SuggestApi?` +
      `$filter=Type&` +
      `$token=1001&` +
      `client=pc&` +
      `v=2.964&` +
      `k=${encodeURIComponent(query)}`;

    const response = await axios.get(url, { timeout: 10000 });

    const data = response.data;

    if (!data || !data.Datas) {
      return NextResponse.json({ stocks: [] });
    }

    type EastMoneyStockItem = {
      Code: string;
      Name: string;
      Market: string;
      Type: string;
    };

    const stocks = (data.Datas as EastMoneyStockItem[]).map((item) => ({
      code: item.Code,
      name: item.Name,
      market: item.Market,
      type: item.Type,
    }));

    return NextResponse.json({ stocks });
  } catch (error) {
    console.error('Stock search API Error:', error);
    return NextResponse.json({ error: 'Failed to search stocks' }, { status: 500 });
  }
}
