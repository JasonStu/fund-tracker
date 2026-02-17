import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// 根据 CATEGORY 判断类型
// CATEGORY: 700=基金, 150=深市股票, 100/1=沪市股票, 600=指数
function getTypeFromCategory(category: string, categoryDesc: string): 'fund' | 'stock' | 'index' | 'unknown' {
  const desc = categoryDesc || '';

  // 基金
  if (category === '700' || desc.includes('基金')) {
    return 'fund';
  }

  // 指数
  if (category === '600' || desc.includes('指数')) {
    return 'index';
  }

  // 股票
  if (category === '150' || category === '1' || category === '100' || desc.includes('市')) {
    return 'stock';
  }

  return 'unknown';
}

// 判断代码是否为股票（仅作为备选）
function isLikelyStockCode(code: string): boolean {
  const c = code.toUpperCase();
  // 港股
  if (c.startsWith('HK') || /^\d{5}$/.test(c)) return true;
  // 沪市股票: 600, 601, 603, 605, 688
  if (/^6[0-9]{2}[0-9]{3}$/.test(c)) return true;
  // 创业板: 300 (排除000xxx中可能是基金的情况)
  if (/^3[0-9]{2}[0-9]{3}$/.test(c)) return true;
  return false;
}

// 基金搜索 - 使用东方财富API
async function searchFunds(query: string) {
  try {
    const url = `https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx?m=1&key=${encodeURIComponent(query)}`;
    const response = await axios.get(url, { timeout: 10000 });
    const data = response.data;

    if (!data || !data.Datas) {
      return [];
    }

    type EastMoneyItem = {
      CODE: string;
      NAME: string;
      CATEGORY: string;
      CATEGORYDESC: string;
    };

    return (data.Datas as EastMoneyItem[])
      .map((item) => {
        const detectedType = getTypeFromCategory(item.CATEGORY, item.CATEGORYDESC);
        return {
          code: item.CODE,
          name: item.NAME,
          // 如果API能确定类型就用API的，否则用代码模式判断
          type: detectedType === 'unknown'
            ? (isLikelyStockCode(item.CODE) ? 'stock' as const : 'fund' as const)
            : (detectedType === 'index' ? 'stock' as const : detectedType as 'fund' | 'stock'),
          category: item.CATEGORY,
          categoryDesc: item.CATEGORYDESC,
        };
      })
      .filter(item => {
        // 过滤掉指数
        return item.type !== 'index';
      });
  } catch (error) {
    console.error('Fund search error:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const type = searchParams.get('type'); // 'fund' | 'stock' | undefined (all)

  if (!query || query.length < 1) {
    return NextResponse.json({ results: [] });
  }

  try {
    // 只搜索一次，使用API的CATEGORY字段判断类型
    const results = await searchFunds(query);

    // 去重：相同代码保留一个
    const seen = new Map<string, typeof results[0]>();
    for (const item of results) {
      if (!seen.has(item.code)) {
        seen.set(item.code, item);
      }
      // 如果之前是股票现在是基金，可能需要保留（但以API为准）
    }

    let filteredResults = Array.from(seen.values())
      .map(item => ({
        code: item.code,
        name: item.name,
        type: item.type,
      }));

    // 按类型过滤
    if (type === 'fund') {
      filteredResults = filteredResults.filter(r => r.type === 'fund');
    } else if (type === 'stock') {
      filteredResults = filteredResults.filter(r => r.type === 'stock');
    }

    // 限制返回数量
    const limitedResults = filteredResults.slice(0, 20);

    return NextResponse.json({ results: limitedResults });
  } catch (error) {
    console.error('Search API Error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
