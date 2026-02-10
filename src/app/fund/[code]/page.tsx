'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FundRealtimeValuation, StockRealtime } from '@/types';
import { useParams } from 'next/navigation';
import ReactECharts from 'echarts-for-react';
import numeral from 'numeral';

export default function FundDetail() {
  const params = useParams();
  const code = params?.code as string;

  const [valuation, setValuation] = useState<FundRealtimeValuation | null>(null);
  const [holdings, setHoldings] = useState<any[]>([]); // Using any for now to mix holding info + realtime stock info
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;

    const fetchData = async () => {
      try {
        // Fetch Realtime Valuation (which internally fetches holdings and stock realtime)
        // 1. Valuation
        const valRes = await axios.get(`/api/funds/realtime?code=${code}`);
        setValuation(valRes.data);

        // 2. Holdings with Realtime Stock Info
        const holdingsRes = await axios.get(`/api/funds/${code}/holdings`);
        const holdingsData = holdingsRes.data.holdings;
        
        if (holdingsData.length > 0) {
          const stockCodes = holdingsData.map((h: any) => h.stockCode).join(',');
          const stocksRes = await axios.get(`/api/stocks/realtime?codes=${stockCodes}`);
          const stocksMap = new Map();
          stocksRes.data.stocks.forEach((s: StockRealtime) => {
             // Remove sh/sz
             const simpleCode = s.code.replace(/^(sh|sz|hk|usr_)/, '');
             stocksMap.set(simpleCode, s);
          });

          const combinedHoldings = holdingsData.map((h: any) => {
            const stock = stocksMap.get(h.stockCode);
            return {
              ...h,
              realtime: stock
            };
          });
          setHoldings(combinedHoldings);
        }

        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch fund data');
        setLoading(false);
      }
    };

    fetchData();
    // Refresh every 30s
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [code]);

  if (loading && !valuation) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!valuation) return null;

  // Chart Data Preparation (Pie Chart of Holdings)
  const pieOption = {
    title: {
      text: 'Top Holdings Distribution',
      left: 'center'
    },
    tooltip: {
      trigger: 'item'
    },
    series: [
      {
        name: 'Holdings',
        type: 'pie',
        radius: '50%',
        data: holdings.map(h => ({
          value: h.proportion,
          name: h.stockName
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900">{valuation.fundName} ({valuation.fundCode})</h1>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">Net Asset Value (NAV)</p>
            <p className="text-xl font-semibold">{valuation.nav}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Estimated NAV</p>
            <p className={`text-xl font-semibold ${valuation.estimatedChange >= 0 ? 'text-red-500' : 'text-green-500'}`}>
              {numeral(valuation.estimatedNav).format('0.0000')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Est. Change</p>
            <p className={`text-xl font-semibold ${valuation.estimatedChange >= 0 ? 'text-red-500' : 'text-green-500'}`}>
              {valuation.estimatedChange >= 0 ? '+' : ''}{numeral(valuation.estimatedChangePercent).format('0.00')}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Time</p>
            <p className="text-gray-900">{valuation.calculationTime.split(' ')[1]}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Holdings Table */}
        <div className="lg:col-span-2 bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Top Holdings Realtime Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Prev Close</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Proportion</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {holdings.map((holding) => {
                  const stock = holding.realtime as StockRealtime | undefined;
                  const isUp = stock && stock.change >= 0;
                  
                  return (
                    <tr key={holding.stockCode} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{holding.stockName}</div>
                            <div className="text-sm text-gray-500">{holding.stockCode}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {stock ? stock.currentPrice.toFixed(2) : '-'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${isUp ? 'text-red-500' : 'text-green-500'}`}>
                        {stock ? (
                          <>
                            {stock.change > 0 ? '+' : ''}{numeral(stock.changePercent).format('0.00')}%
                          </>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                        {stock ? stock.previousClose.toFixed(2) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        {numeral(holding.proportion).format('0.00')}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white shadow rounded-lg p-6">
           <ReactECharts option={pieOption} />
        </div>
      </div>
    </div>
  );
}
