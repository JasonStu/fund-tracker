'use client';

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { FundRealtimeValuation, StockRealtime } from '@/types';
import { useParams } from 'next/navigation';
import ReactECharts from 'echarts-for-react';
import numeral from 'numeral';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';

export default function FundDetail() {
  const t = useTranslations('FundDetail');
  const params = useParams();
  const code = params?.code as string;

  const [valuation, setValuation] = useState<FundRealtimeValuation | null>(null);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;

    const fetchData = async () => {
      try {
        const valRes = await axios.get(`/api/funds/realtime?code=${code}`);
        setValuation(valRes.data);

        const holdingsRes = await axios.get(`/api/funds/${code}/holdings`);
        const holdingsData = holdingsRes.data.holdings;

        if (holdingsData.length > 0) {
          const stockCodes = holdingsData.map((h: any) => h.stockCode).join(',');
          const stocksRes = await axios.get(`/api/stocks/realtime?codes=${stockCodes}`);
          const stocksMap = new Map();
          stocksRes.data.stocks.forEach((s: StockRealtime) => {
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
        setError(t('error'));
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [code, t]);

  if (loading && !valuation) return <div className="p-8 text-center text-[#e0e0e0]">{t('loading')}</div>;
  if (error) return <div className="p-8 text-center text-[#ff3333]">{error}</div>;
  if (!valuation) return null;

  // Chart Data Preparation (Pie Chart of Holdings) - Cyberpunk colors
  const pieOption = {
    backgroundColor: 'transparent',
    title: {
      text: t('chartTitle'),
      left: 'center',
      textStyle: {
        color: '#e0e0e0',
        fontSize: 16
      }
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: '#1a1a25',
      borderColor: '#ff00ff',
      textStyle: { color: '#e0e0e0' }
    },
    series: [
      {
        name: t('table.proportion'),
        type: 'pie',
        radius: '50%',
        center: ['50%', '55%'],
        data: holdings.map(h => ({
          value: h.proportion,
          name: h.stockName,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 1, y2: 1,
              colorStops: [
                { offset: 0, color: '#ff00ff' },
                { offset: 0.5, color: '#bf00ff' },
                { offset: 1, color: '#00ffff' }
              ]
            }
          }
        })),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(255, 0, 255, 0.5)'
          }
        },
        label: {
          color: '#e0e0e0'
        }
      }
    ]
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/" className="inline-flex items-center gap-2 text-[#00ffff] hover:text-[#ff00ff] transition-colors">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Portfolio
      </Link>

      {/* Header Card */}
      <div className="panel-metal p-6">
        <h1 className="text-2xl font-bold text-[#e0e0e0] glitch-text" data-text={`${valuation.fundName} (${valuation.fundCode})`}>
          {valuation.fundName} ({valuation.fundCode})
        </h1>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">{t('nav')}</p>
            <p className="text-xl font-semibold text-[#e0e0e0]">{valuation.nav}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('estNav')}</p>
            <p className={`text-xl font-semibold ${valuation.estimatedChange >= 0 ? 'text-[#ff3333]' : 'text-[#33ff33]'}`}>
              {numeral(valuation.estimatedNav).format('0.0000')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('estChange')}</p>
            <p className={`text-xl font-semibold ${valuation.estimatedChange >= 0 ? 'text-[#ff3333]' : 'text-[#33ff33]'}`}>
              {valuation.estimatedChange >= 0 ? '+' : ''}{numeral(valuation.estimatedChangePercent).format('0.00')}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('time')}</p>
            <p className="text-[#e0e0e0]">{valuation.calculationTime.split(' ')[1]}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Holdings Table */}
        <div className="lg:col-span-2 panel-metal overflow-hidden">
          <div className="px-6 py-4 border-b border-[#2a2a3a]">
            <h3 className="text-lg font-medium text-[#e0e0e0]">{t('topHoldingsTitle')}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-[#2a2a3a]">
              <thead className="bg-[#0d0d15]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table.stock')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table.price')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table.change')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table.prevClose')}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('table.proportion')}</th>
                </tr>
              </thead>
              <tbody className="bg-[#12121a] divide-y divide-[#2a2a3a]">
                {holdings.map((holding) => {
                  const stock = holding.realtime as StockRealtime | undefined;
                  const isUp = stock && stock.change >= 0;

                  return (
                    <tr key={holding.stockCode} className="hover:bg-[#1a1a25]">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-[#e0e0e0]">{holding.stockName}</div>
                            <div className="text-sm text-gray-500">{holding.stockCode}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-[#e0e0e0]">
                        {stock ? stock.currentPrice.toFixed(2) : '-'}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${isUp ? 'text-[#ff3333]' : 'text-[#33ff33]'}`}>
                        {stock ? (
                          <>
                            {stock.change > 0 ? '+' : ''}{numeral(stock.changePercent).format('0.00')}%
                          </>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                        {stock ? stock.previousClose.toFixed(2) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-[#e0e0e0]">
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
        <div className="panel-metal p-6">
           <ReactECharts option={pieOption} style={{ height: '350px', width: '100%' }} />
        </div>
      </div>
    </div>
  );
}
