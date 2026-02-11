import axios from 'axios';
import { FundDetail, FundHolding, QuarterlyHolding } from '@/types';

// Helper to strip HTML tags
const stripTags = (s: string) => s.replace(/<[^>]+>/g, '').trim();

// Helper to parse holdings from a tbody string
const parseHoldingsFromTbody = (tbody: string): FundHolding[] => {
  const holdings: FundHolding[] = [];
  const rows = tbody.match(/<tr>(.*?)<\/tr>/g);
  
  if (rows) {
    rows.forEach((row: string) => {
      const cols = row.match(/<td.*?>(.*?)<\/td>/g);
      if (cols && cols.length >= 7) {
        
        const stockCode = stripTags(cols[1]);
        const stockName = stripTags(cols[2]);
        
        // Find percentage column dynamically
        let proportionStr = '0';
        for (let i = 3; i < cols.length; i++) {
          const text = stripTags(cols[i]);
          if (/^\d+(\.\d+)?%$/.test(text)) {
            proportionStr = text.replace('%', '');
            break;
          }
        }
        
        if (stockCode && stockName) {
          holdings.push({
            stockCode,
            stockName,
            proportion: parseFloat(proportionStr) || 0,
            shares: 0,
            nav: 0
          });
        }
      }
    });
  }
  return holdings;
};

export interface FundHistoryNAV {
  date: string;
  nav: number;
  accNav: number;
  changeRate: string;
}

export interface FundPerformance {
  netWorthTrend: { x: number; y: number; equityReturn: number; unitMoney: string }[];
  acWorthTrend: { x: number; y: number }[];
  grandTotal: { name: string; data: [number, number][] }[]; // Comparison data: [timestamp, value]
}

export const getFundHistoryNAV = async (code: string, pageSize = 365): Promise<FundHistoryNAV[]> => {
  const url = `http://api.fund.eastmoney.com/f10/lsjz`;
  
  try {
    const response = await axios.get(url, {
      params: {
        fundCode: code,
        pageIndex: 1,
        pageSize: pageSize,
      },
      headers: {
        'Referer': 'http://fundf10.eastmoney.com/',
      }
    });

    const data = response.data;
    if (data.Data && data.Data.LSJZList) {
      type LSJZItem = { FSRQ: string; DWJZ: string; LJJZ: string; JZZZL: string };
      return (data.Data.LSJZList as LSJZItem[]).map((item) => ({
        date: item.FSRQ,
        nav: Number(item.DWJZ),
        accNav: Number(item.LJJZ),
        changeRate: item.JZZZL
      }));
    }
    return [];
  } catch (error) {
    console.error('Fetch history NAV failed', error);
    return [];
  }
};

export const getFundPerformanceData = async (code: string): Promise<FundPerformance | null> => {
  const url = `http://fund.eastmoney.com/pingzhongdata/${code}.js`;
  
  try {
    const response = await axios.get(url);
    const scriptContent = response.data;

    // Extract Net Worth Trend
    const netWorthMatch = scriptContent.match(/var Data_netWorthTrend = (\[.*?\]);/);
    const netWorthTrend = netWorthMatch ? JSON.parse(netWorthMatch[1]) : [];

    // Extract AC Worth Trend
    const acWorthMatch = scriptContent.match(/var Data_ACWorthTrend = (\[.*?\]);/);
    const acWorthTrend = acWorthMatch ? JSON.parse(acWorthMatch[1]) : [];

    // Extract Grand Total (Benchmark Comparison)
    const grandTotalMatch = scriptContent.match(/var Data_grandTotal = (\[.*?\]);/);
    const grandTotal = grandTotalMatch ? JSON.parse(grandTotalMatch[1]) : [];
    
    return {
      netWorthTrend,
      acWorthTrend,
      grandTotal
    };
  } catch (error) {
    console.error('Fetch performance data failed', error);
    return null;
  }
};

export const getFundHoldings = async (code: string): Promise<FundDetail> => {
  // 1. Get Fund Basic Info
  const basicInfoUrl = `http://fundgz.1234567.com.cn/js/${code}.js`;
  const basicInfoPromise = axios.get(basicInfoUrl).catch(() => ({ data: '' }));

  // 2. Get Fund Holdings (EastMoney Web Page Parsing)
  // topline=200 to fetch more data, potentially all holdings for the quarter
  const holdingsUrl = `http://fundf10.eastmoney.com/FundArchivesDatas.aspx?type=jjcc&code=${code}&topline=20`;
  const holdingsPromise = axios.get(holdingsUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'http://fundf10.eastmoney.com/'
    }
  });

  // 3. Get Fund Scale (EastMoney JBGK Page)
  const scaleUrl = `http://fundf10.eastmoney.com/jbgk_${code}.html`;
  const scalePromise = axios.get(scaleUrl).catch(() => ({ data: '' }));

  // 4. Get Fund Performance Data
  const performancePromise = getFundPerformanceData(code);

  const [basicResponse, holdingsResponse, scaleResponse, performanceData] = await Promise.all([basicInfoPromise, holdingsPromise, scalePromise, performancePromise]);

  let fundName = '';
  let nav = 0;
  let navDate = '';
  let fundScale = '';
  
  const basicData = basicResponse.data;
  if (basicData && typeof basicData === 'string') {
    const match = basicData.match(/jsonpgz\((.*)\)/);
    if (match) {
      try {
        const json = JSON.parse(match[1]);
        fundName = json.name;
        nav = parseFloat(json.dwjz);
        navDate = json.jzrq;
      } catch (e) {
        console.error('Parse basic info error', e);
      }
    }
  }

  const scaleData = scaleResponse.data;
  if (scaleData && typeof scaleData === 'string') {
      const scaleMatch = scaleData.match(/<th>净资产规模<\/th><td>(.*?)（/);
      if (scaleMatch) {
          fundScale = scaleMatch[1];
      }
  }

  const holdingsData = holdingsResponse.data;
  const quarterlyHoldings: QuarterlyHolding[] = [];

  if (holdingsData && typeof holdingsData === 'string') {
    try {
      // Extract content from "var apidata={ content:\"...\",arryear:..."
      const contentMatch = holdingsData.match(/content:"([\s\S]*?)",arryear:/);
      if (contentMatch) {
        // Unescape quotes
        const html = contentMatch[1].replace(/\\"/g, '"');
        
        // Regex to find Date + Table
        // Pattern matches: Date header (either font class='px12' or h4) followed by tbody
        const blockRegex = /(?:<font class='px12'>|<h4[^>]*>)(\d{4}-\d{2}-\d{2})(?:<\/font>|<\/h4>)[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/gi;

        let match;
        let lastIndex = 0;
        const maxIterations = 100; // Prevent infinite loop
        let iterations = 0;

        while (iterations < maxIterations) {
          blockRegex.lastIndex = lastIndex;
          match = blockRegex.exec(html);
          if (!match) break;

          iterations++;
          lastIndex = blockRegex.lastIndex;

          const date = match[1];
          const tbody = match[2];
          const holdings = parseHoldingsFromTbody(tbody);
          if (holdings.length > 0) {
            // Avoid duplicates if any
            if (!quarterlyHoldings.find(q => q.quarter === date)) {
              quarterlyHoldings.push({ quarter: date, holdings });
            }
          }
        }
      }
    } catch (e) {
      console.error('Parse holdings error', e);
    }
  }
  
  // Sort by date descending
  quarterlyHoldings.sort((a, b) => new Date(b.quarter).getTime() - new Date(a.quarter).getTime());

  const latest = quarterlyHoldings[0];

  return {
    code,
    name: fundName || `Fund ${code}`,
    type: 'N/A',
    nav,
    navDate,
    holdings: latest ? latest.holdings : [],
    reportDate: latest ? latest.quarter : '',
    fundScale,
    quarterlyHoldings,
    performance: performanceData || undefined
  };
};
