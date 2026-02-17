import iconv from 'iconv-lite';
import { createExternalClient } from '@/lib/api/externalClient';
import { parseSinaStock, getStockMarketCode } from '@/utils/api';
import { StockRealtime } from '@/types';

const sinaClient = createExternalClient('sinaStocks');

export const getRealtimeStocks = async (codes: string[]): Promise<StockRealtime[]> => {
  if (codes.length === 0) return [];

  // Ensure codes have market prefix
  const stockList = codes.map(code => getStockMarketCode(code));
  // Remove duplicates
  const uniqueStockList = Array.from(new Set(stockList));

  const url = `/list=${uniqueStockList.join(',')}`;

  try {
    const response = await sinaClient.get(url, {
      responseType: 'arraybuffer',
    });
    const data = iconv.decode(response.data, 'gbk');
    const stocks: StockRealtime[] = [];
    
    const lines = data.split(';');
    for (const line of lines) {
      if (line.trim().length > 10) {
        const codeMatch = line.match(/hq_str_([a-z0-9]+)=/);
        if (codeMatch) {
          const code = codeMatch[1];
          const stockData = parseSinaStock(code, line);
          if (stockData) {
            stocks.push(stockData);
          }
        }
      }
    }
    return stocks;
  } catch (error) {
    console.error('Error fetching realtime stocks:', error);
    return [];
  }
};
