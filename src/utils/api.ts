import axios from 'axios';
import iconv from 'iconv-lite';
import { StockRealtime } from '../types';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';

export const fetchWithGBK = async (url: string) => {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    headers: { 
      'User-Agent': USER_AGENT,
      'Referer': 'https://finance.sina.com.cn/'
    }
  });
  return iconv.decode(response.data, 'gbk');
};

export const fetchJson = async <T>(url: string): Promise<T> => {
  const response = await axios.get(url, {
    headers: { 
      'User-Agent': USER_AGENT,
      'Referer': 'https://finance.sina.com.cn/'
    }
  });
  return response.data;
};

export const parseSinaStock = (code: string, data: string): Stock | null => {
  const match = data.match(/="(.*)"/); // Removed ; requirement
  if (!match) return null;
  
  const params = match[1].split(',');
  
  let name: string;
  let currentPrice: number;
  let previousClose: number;
  let change: number;
  let changePercent: number;

  if (code.startsWith('hk')) {
    // HK Stock Format: EngName,Name,Open,PreClose,High,Low,Current,Change,Change%,...
    if (params.length < 10) return null;
    name = params[1];
    currentPrice = parseFloat(params[6]);
    previousClose = parseFloat(params[3]);
    change = parseFloat(params[7]);
    changePercent = parseFloat(params[8]);
  } else {
    // A Share Format
    if (params.length < 30) return null;
    name = params[0];
    currentPrice = parseFloat(params[3]);
    previousClose = parseFloat(params[2]);
    change = currentPrice - previousClose;
    changePercent = previousClose === 0 ? 0 : ((currentPrice - previousClose) / previousClose) * 100;
  }
  
  return {
    code,
    name,
    currentPrice,
    previousClose,
    change,
    changePercent,
    // volume: parseFloat(params[8]), // Different for HK/A
    // updateTime: ...
  };
};

export const getStockMarketCode = (code: string): string => {
  if (code.length === 5) return `hk${code}`; // Simple HK detection
  if (code.startsWith('6')) return `sh${code}`;
  if (code.startsWith('0') || code.startsWith('3')) return `sz${code}`;
  if (code.startsWith('sh') || code.startsWith('sz')) return code;
  return `sh${code}`; 
};
