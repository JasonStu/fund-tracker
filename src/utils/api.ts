import axios from 'axios';
import iconv from 'iconv-lite';
import { StockRealtime } from '../types';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

export const fetchWithGBK = async (url: string) => {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: { 'User-Agent': USER_AGENT }
  });
  return iconv.decode(response.data, 'gbk');
};

export const fetchJson = async (url: string) => {
  const response = await axios.get(url, {
    headers: { 'User-Agent': USER_AGENT }
  });
  return response.data;
};

export const parseSinaStock = (code: string, data: string): StockRealtime | null => {
  // Format: var hq_str_sh601006="Name,Open,PreClose,Current,High,Low,Buy,Sell,Vol,Amount,...";
  const match = data.match(/="(.*)";/);
  if (!match) return null;
  
  const params = match[1].split(',');
  if (params.length < 30) return null;
  
  const currentPrice = parseFloat(params[3]);
  const previousClose = parseFloat(params[2]);
  
  return {
    code,
    name: params[0],
    currentPrice,
    previousClose,
    change: currentPrice - previousClose,
    changePercent: previousClose === 0 ? 0 : ((currentPrice - previousClose) / previousClose) * 100,
    volume: parseFloat(params[8]),
    updateTime: `${params[30]} ${params[31]}`
  };
};

export const getStockMarketCode = (code: string): string => {
  // Simple heuristic: 6 starts is sh, 0/3 starts is sz, but need more robust logic or try both
  // For standard A-share:
  if (code.startsWith('6')) return `sh${code}`;
  if (code.startsWith('0') || code.startsWith('3')) return `sz${code}`;
  if (code.startsWith('sh') || code.startsWith('sz')) return code;
  // Fallback or HK/US logic could be added here
  return `sh${code}`; 
};
