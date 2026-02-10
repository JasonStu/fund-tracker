import axios from 'axios';
import { FundDetail, FundHolding } from '@/types';

export const getFundHoldings = async (code: string): Promise<FundDetail> => {
  // 1. Get Fund Basic Info
  const basicInfoUrl = `http://fundgz.1234567.com.cn/js/${code}.js`;
  // Basic info might fail or return 404/empty, handle gracefully
  const basicInfoPromise = axios.get(basicInfoUrl).catch(() => ({ data: '' }));

  // 2. Get Fund Holdings (EastMoney Web Page Parsing)
  // Replaced deprecated API with web scraping from fundf10.eastmoney.com
  const holdingsUrl = `http://fundf10.eastmoney.com/FundArchivesDatas.aspx?type=jjcc&code=${code}&topline=10`;
  const holdingsPromise = axios.get(holdingsUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'http://fundf10.eastmoney.com/'
    }
  });

  const [basicResponse, holdingsResponse] = await Promise.all([basicInfoPromise, holdingsPromise]);

  let fundName = '';
  let nav = 0;
  let navDate = '';
  
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

  const holdingsData = holdingsResponse.data;
  const holdings: FundHolding[] = [];
  let reportDate = '';

  if (holdingsData && typeof holdingsData === 'string') {
    try {
      // Extract content from "var apidata={ content:\"...\",arryear:..."
      const contentMatch = holdingsData.match(/content:"([\s\S]*?)",arryear:/);
      if (contentMatch) {
        // Unescape quotes
        const html = contentMatch[1].replace(/\\"/g, '"');
        
        // Find the report date from the first header "截止至：2025-09-30"
        const dateMatch = html.match(/截止至：<font class='px12'>(\d{4}-\d{2}-\d{2})<\/font>/);
        if (dateMatch) {
          reportDate = dateMatch[1];
        }

        // Extract the first table body (latest quarter)
        const tbodyMatch = html.match(/<tbody>(.*?)<\/tbody>/);
        if (tbodyMatch) {
          const rows = tbodyMatch[1].match(/<tr>(.*?)<\/tr>/g);
          if (rows) {
            rows.forEach((row: string) => {
              const cols = row.match(/<td.*?>(.*?)<\/td>/g);
              if (cols && cols.length >= 7) {
                // Helper to strip HTML tags
                const stripTags = (s: string) => s.replace(/<[^>]+>/g, '').trim();
                
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
        }
      }
    } catch (e) {
      console.error('Parse holdings error', e);
    }
  }

  return {
    code,
    name: fundName || `Fund ${code}`,
    type: 'N/A',
    nav,
    navDate,
    holdings,
    reportDate
  };
};
