import { NextRequest, NextResponse } from 'next/server';
import { getFundHoldings } from '@/services/fundService';
import { getRealtimeStocks } from '@/services/stockService';
import dayjs from 'dayjs';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Fund code is required' }, { status: 400 });
  }

  try {
    // 1. Get Fund Holdings
    const fundDetail = await getFundHoldings(code);
    
    if (!fundDetail.holdings || fundDetail.holdings.length === 0) {
      return NextResponse.json({
        fundCode: code,
        fundName: fundDetail.name,
        nav: fundDetail.nav,
        estimatedNav: fundDetail.nav,
        estimatedChange: 0,
        estimatedChangePercent: 0,
        calculationTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        error: 'No holdings data available'
      });
    }

    // 2. Get Realtime Stock Data
    const stockCodes = fundDetail.holdings.map(h => h.stockCode);
    const realtimeStocks = await getRealtimeStocks(stockCodes);
    
    // Create a map for quick lookup
    const stockMapNormalized = new Map();
    realtimeStocks.forEach(s => {
      // Remove sh/sz prefix for matching
      const simpleCode = s.code.replace(/^(sh|sz|hk|usr_)/, '');
      stockMapNormalized.set(simpleCode, s);
    });

    // 3. Calculate Valuation
    let totalWeightedChangePercent = 0;
    
    fundDetail.holdings.forEach(holding => {
      const stock = stockMapNormalized.get(holding.stockCode);
      if (stock) {
        // holding.proportion is percentage (e.g. 5.5 means 5.5%)
        // stock.changePercent is percentage (e.g. 1.2 means 1.2%)
        // contribution = 1.2 * (5.5 / 100) = 0.066 (%)
        const contribution = stock.changePercent * (holding.proportion / 100);
        totalWeightedChangePercent += contribution;
      }
    });

    // estimatedChangePercent is already in %
    const estimatedChangePercent = totalWeightedChangePercent;
    const estimatedNav = fundDetail.nav * (1 + estimatedChangePercent / 100);
    const estimatedChange = estimatedNav - fundDetail.nav;

    return NextResponse.json({
      fundCode: code,
      fundName: fundDetail.name,
      nav: fundDetail.nav,
      estimatedNav,
      estimatedChange,
      estimatedChangePercent,
      calculationTime: dayjs().format('YYYY-MM-DD HH:mm:ss')
    });

  } catch (error) {
    console.error('Valuation API Error:', error);
    return NextResponse.json({ error: 'Failed to calculate valuation' }, { status: 500 });
  }
}
