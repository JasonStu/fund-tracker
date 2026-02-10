import axios from 'axios';
import { FundDetail, FundHolding } from '@/types';

export const getFundHoldings = async (code: string): Promise<FundDetail> => {
  // 1. Get Fund Basic Info
  const basicInfoUrl = `http://fundgz.1234567.com.cn/js/${code}.js`;
  // Basic info might fail or return 404/empty, handle gracefully
  const basicInfoPromise = axios.get(basicInfoUrl).catch(() => ({ data: '' }));

  // 2. Get Fund Holdings (EastMoney App API)
  const holdingsUrl = `https://fundmobapi.eastmoney.com/FundMNewApi/FundMNInverstPosition?FCODE=${code}&deviceid=Wap&product=Fund&plat=Wap&version=2.0.0`;
  const holdingsPromise = axios.get(holdingsUrl);

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

  if (holdingsData && holdingsData.Datas) {
    reportDate = holdingsData.Expansion?.FSRQ || '';
    holdingsData.Datas.forEach((item: any) => {
      holdings.push({
        stockCode: item.GPDM,
        stockName: item.GPJC,
        proportion: parseFloat(item.JZBL),
        shares: 0,
        nav: 0 
      });
    });
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
