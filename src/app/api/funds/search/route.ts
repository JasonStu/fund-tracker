import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ funds: [] });
  }

  try {
    const url = `https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx?m=1&key=${encodeURIComponent(query)}`;
    const response = await axios.get(url);
    
    // Response format: var FundSearchAPIResult = { "Datas": [...] };
    // Or JSON directly depending on headers, but usually it's JSON.
    // Let's check response data type. The API usually returns JSON if not JSONP.
    
    const data = response.data;
    
    // Map external data to our internal model
    const funds = data.Datas.map((item: any) => ({
      code: item.CODE,
      name: item.NAME,
      type: item.FundType,
    }));

    return NextResponse.json({ funds });
  } catch (error) {
    console.error('Search API Error:', error);
    return NextResponse.json({ error: 'Failed to search funds' }, { status: 500 });
  }
}
