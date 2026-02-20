'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { Position, Transaction, StockRealtime } from '@/types';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import ReactECharts from 'echarts-for-react';
import numeral from 'numeral';
import clsx from 'clsx';
import { StockMaSelector } from '@/components/StockMaSelector';
import { MACD, SMA, RSI } from 'technicalindicators';

interface StockKlineData {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  amount: number;
}

interface IntradayData {
  date: string;
  time: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  avgPrice: number;
}

interface MoneyflowData {
  date: string;
  mainInflow: number;
  mainOutflow: number;
  mainNetInflow: number;
  retailInflow: number;
  retailOutflow: number;
  retailNetInflow: number;
}

type ChartType = 'intraday' | 'daily' | 'weekly' | 'monthly';

const CHART_TYPES: { key: ChartType; label: string }[] = [
  { key: 'intraday', label: '分时' },
  { key: 'daily', label: '日K' },
  { key: 'weekly', label: '周K' },
  { key: 'monthly', label: '月K' },
];

const MA_COLORS: Record<number, string> = {
  5: '#FF6B6B',
  10: '#4ECDC4',
  15: '#45B7D1',
  20: '#96CEB4',
  60: '#DDA0DD',
};

export default function StockDetailPage() {
  const t = useTranslations('StockDetail');
  const tOverview = useTranslations('StockDetail.overview');
  const tChart = useTranslations('StockDetail.chart');
  const tTransactions = useTranslations('StockDetail.transactions');
  
  const params = useParams();
  const code = params?.code as string;

  const [position, setPosition] = useState<Position | null>(null);
  const [stockRealtime, setStockRealtime] = useState<StockRealtime | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [klineData, setKlineData] = useState<StockKlineData[]>([]);
  const [intradayData, setIntradayData] = useState<IntradayData[]>([]);
  const [moneyflowData, setMoneyflowData] = useState<MoneyflowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const OVERVIEW_TAB = 'overview';
  const CHART_TAB = 'chart';
  const TRANSACTIONS_TAB = 'transactions';
  const [activeTab, setActiveTab] = useState(OVERVIEW_TAB);

  const [chartType, setChartType] = useState<ChartType>('intraday');
  const [selectedMas, setSelectedMas] = useState<number[]>([5, 10, 20]);
  const [customMas, setCustomMas] = useState<number[]>([]);

  const handleTogglePreset = (ma: number) => {
    setSelectedMas(prev => 
      prev.includes(ma) ? prev.filter(m => m !== ma) : [...prev, ma]
    );
  };

  const handleAddCustom = (ma: number) => {
    if (!customMas.includes(ma)) {
      setCustomMas(prev => [...prev, ma]);
    }
  };

  const handleRemoveCustom = (ma: number) => {
    setCustomMas(prev => prev.filter(m => m !== ma));
    setSelectedMas(prev => prev.filter(m => m !== ma));
  };

  useEffect(() => {
    if (!code) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        const userFundsRes = await axios.get('/api/user-funds');
        const { positions: allPositions, transactions: allTransactions } = userFundsRes.data;

        const stockPosition = allPositions.find(
          (p: Position) => p.code === code && p.type === 'stock'
        );
        setPosition(stockPosition || null);

        const stockTransactions = (allTransactions as Transaction[]).filter(
          (tx) => tx.code === code && tx.type === 'stock'
        );
        setTransactions(stockTransactions);

        const stockRes = await axios.get(`/api/stocks/realtime?codes=${code}`);
        if (stockRes.data.stocks && stockRes.data.stocks.length > 0) {
          setStockRealtime(stockRes.data.stocks[0]);
        }

        setLoading(false);
      } catch (err) {
        console.error(err);
        setError(t('error'));
        setLoading(false);
      }
    };

    fetchData();

    const interval = setInterval(async () => {
      try {
        const stockRes = await axios.get(`/api/stocks/realtime?codes=${code}`);
        if (stockRes.data.stocks && stockRes.data.stocks.length > 0) {
          setStockRealtime(stockRes.data.stocks[0]);
        }
      } catch (e) {
        console.error(e);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [code, t]);

  useEffect(() => {
    if (activeTab !== CHART_TAB || !code) return;

    const fetchKline = async () => {
      try {
        const period = chartType === 'intraday' ? 'daily' : chartType;
        const res = await axios.get(`/api/stocks/kline?code=${code}&period=${period}`);
        setKlineData(res.data.klines || []);
      } catch (err) {
        console.error('Failed to fetch kline', err);
        setKlineData([]);
      }
    };

    const fetchIntraday = async () => {
      try {
        const res = await axios.get(`/api/stocks/intraday?code=${code}&days=5`);
        setIntradayData(res.data.intraday || []);
      } catch (err) {
        console.error('Failed to fetch intraday', err);
        setIntradayData([]);
      }
    };

    const fetchMoneyflow = async () => {
      try {
        const res = await axios.get(`/api/stocks/moneyflow?code=${code}`);
        setMoneyflowData(res.data.moneyflow || []);
      } catch (err) {
        console.error('Failed to fetch moneyflow', err);
        setMoneyflowData([]);
      }
    };

    if (chartType === 'intraday') {
      fetchIntraday();
    } else {
      fetchKline();
    }
    fetchMoneyflow();
  }, [activeTab, code, chartType]);

  const allSelectedMas = useMemo(() => [...selectedMas, ...customMas], [selectedMas, customMas]);

  const macdData = useMemo(() => {
    if (chartType === 'intraday' || klineData.length === 0) return null;
    const closes = klineData.map(k => k.close);
    try {
      return new MACD({
        values: closes,
        fastPeriod: 12,
        slowPeriod: 26,
        signalPeriod: 9,
        SimpleMAOscillator: false,
        SimpleMASignal: false,
      }).getResult();
    } catch {
      return null;
    }
  }, [klineData, chartType]);

  const rsiData = useMemo(() => {
    if (chartType === 'intraday' || klineData.length === 0) return null;
    const closes = klineData.map(k => k.close);
    try {
      return new RSI({ values: closes, period: 14 }).getResult();
    } catch {
      return null;
    }
  }, [klineData, chartType]);

  const klineOption = useMemo(() => {
    if (chartType === 'intraday') {
      if (intradayData.length === 0) return {};
      
      const times = intradayData.map(d => d.time);
      const prices = intradayData.map(d => d.close);
      const volumes = intradayData.map(d => d.volume);
      const avgPrices = intradayData.map(d => d.avgPrice);

      return {
        tooltip: { trigger: 'axis', axisPointer: { type: 'cross' }, backgroundColor: '#1e1e2d', borderColor: '#2a2a3a', textStyle: { color: '#e0e0e0' } },
        grid: [{ left: '10%', right: '10%', top: '10%', height: '50%' }, { left: '10%', right: '10%', top: '65%', height: '15%' }],
        xAxis: [{ type: 'category', data: times, boundaryGap: true, axisLine: { lineStyle: { color: '#2a2a3a' } }, axisLabel: { color: '#aaa' }, splitLine: { show: false } }, { type: 'category', gridIndex: 1, data: times, boundaryGap: true, axisLine: { lineStyle: { color: '#2a2a3a' } }, axisLabel: { show: false }, splitLine: { show: false } }],
        yAxis: [{ scale: true, splitArea: { show: false }, axisLine: { lineStyle: { color: '#2a2a3a' } }, axisLabel: { color: '#aaa' }, splitLine: { lineStyle: { color: '#2a2a3a' } } }, { scale: true, gridIndex: 1, splitNumber: 2, axisLine: { show: false }, axisLabel: { show: false }, splitLine: { show: false } }],
        dataZoom: [{ type: 'inside', xAxisIndex: [0, 1], start: 50, end: 100 }],
        series: [
          { name: '价格', type: 'line', data: prices, smooth: true, lineStyle: { color: '#ff9500', width: 2 }, symbol: 'none' },
          { name: '均价', type: 'line', data: avgPrices, smooth: true, lineStyle: { color: '#4ECDC4', width: 1, type: 'dashed' }, symbol: 'none' },
          { name: 'Volume', type: 'bar', xAxisIndex: 1, yAxisIndex: 1, data: volumes, itemStyle: { color: '#2a2a3a' } },
        ],
      };
    }

    if (klineData.length === 0) return {};

    const dates = klineData.map(k => k.date);
    const ohlc = klineData.map(k => [k.open, k.close, k.low, k.high]);
    const upColor = '#ff3333';
    const downColor = '#00cc00';

    const calculateMA = (period: number) => {
      const closes = klineData.map(k => k.close);
      try {
        const result = new SMA({ values: closes, period }).getResult();
        return result.map((v: number | undefined) => v ?? null);
      } catch {
        return [];
      }
    };

    const maSeries = allSelectedMas.map(ma => ({
      name: `MA${ma}`,
      type: 'line',
      data: calculateMA(ma),
      smooth: true,
      lineStyle: { color: MA_COLORS[ma] || '#ccc', width: 1 },
      symbol: 'none',
    }));

    const volumeData = klineData.map(k => {
      const isUp = k.close >= k.open;
      return { value: k.volume, itemStyle: { color: isUp ? upColor : downColor } };
    });

    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' }, backgroundColor: '#1e1e2d', borderColor: '#2a2a3a', textStyle: { color: '#e0e0e0' } },
      grid: [
        { left: '10%', right: '10%', top: '10%', height: '35%' },
        { left: '10%', right: '10%', top: '50%', height: '12%' },
        { left: '10%', right: '10%', top: '66%', height: '12%' },
        { left: '10%', right: '10%', top: '82%', height: '12%' },
      ],
      xAxis: [
        { type: 'category', data: dates, boundaryGap: true, axisLine: { lineStyle: { color: '#2a2a3a' } }, axisLabel: { color: '#aaa' }, splitLine: { show: false } },
        { type: 'category', gridIndex: 1, data: dates, boundaryGap: true, axisLine: { lineStyle: { color: '#2a2a3a' } }, axisLabel: { show: false }, splitLine: { show: false } },
        { type: 'category', gridIndex: 2, data: dates, boundaryGap: true, axisLine: { lineStyle: { color: '#2a2a3a' } }, axisLabel: { show: false }, splitLine: { show: false } },
        { type: 'category', gridIndex: 3, data: dates, boundaryGap: true, axisLine: { lineStyle: { color: '#2a2a3a' } }, axisLabel: { show: false }, splitLine: { show: false } },
      ],
      yAxis: [
        { scale: true, splitArea: { show: false }, axisLine: { lineStyle: { color: '#2a2a3a' } }, axisLabel: { color: '#aaa' }, splitLine: { lineStyle: { color: '#2a2a3a' } } },
        { scale: true, gridIndex: 1, splitNumber: 2, axisLine: { show: false }, axisLabel: { show: false }, splitLine: { show: false } },
        { scale: true, gridIndex: 2, splitNumber: 2, axisLine: { show: false }, axisLabel: { show: false }, splitLine: { show: false } },
        { scale: true, gridIndex: 3, splitNumber: 2, axisLine: { show: false }, axisLabel: { show: false }, splitLine: { show: false } },
      ],
      dataZoom: [{ type: 'inside', xAxisIndex: [0, 1, 2, 3], start: 50, end: 100 }],
      series: [
        { name: 'K线', type: 'candlestick', data: ohlc, itemStyle: { color: upColor, color0: downColor, borderColor: upColor, borderColor0: downColor } },
        ...maSeries,
        { name: 'Volume', type: 'bar', xAxisIndex: 1, yAxisIndex: 1, data: volumeData },
        ...(macdData ? [
          { name: 'MACD', type: 'line', xAxisIndex: 2, yAxisIndex: 2, data: macdData.MACD, lineStyle: { color: '#fff' }, symbol: 'none' },
          { name: 'DIF', type: 'line', xAxisIndex: 2, yAxisIndex: 2, data: macdData.dif, lineStyle: { color: '#FF6B6B' }, symbol: 'none' },
          { name: 'DEA', type: 'line', xAxisIndex: 2, yAxisIndex: 2, data: macdData.dea, lineStyle: { color: '#4ECDC4' }, symbol: 'none' },
        ] : []),
        ...(rsiData ? [
          { name: 'RSI', type: 'line', xAxisIndex: 3, yAxisIndex: 3, data: rsiData, lineStyle: { color: '#DDA0DD' }, symbol: 'none' },
        ] : []),
      ],
    };
  }, [klineData, intradayData, chartType, allSelectedMas, macdData, rsiData]);

  if (loading && !position) {
    return <div className="p-8 text-center text-gray-400">{t('loading')}</div>;
  }
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!position) {
    return (
      <div className="p-8 text-center text-gray-400">
        <div>Stock not found</div>
        <Link href="/" className="text-[#ff9500] hover:underline mt-4 inline-block">
          {t('backToPortfolio')}
        </Link>
      </div>
    );
  }

  const isUp = stockRealtime ? stockRealtime.change >= 0 : true;
  const currentPrice = stockRealtime?.currentPrice || position.estimatedNav || 0;
  const change = stockRealtime?.change || position.estimatedChange || 0;
  const changePercent = stockRealtime?.changePercent || position.estimatedChangePercent || 0;

  return (
    <div className="space-y-6">
      <Link href="/" className="inline-flex items-center gap-2 text-[#ff9500] hover:text-[#ffaa33] transition-colors">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        {t('backToPortfolio')}
      </Link>

      <div className="bg-[#1e1e2d] rounded-xl p-6 shadow-sm border border-[#2a2a3a]">
        <h1 className="text-2xl font-bold text-white">{position.name} ({position.code})</h1>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-400">{t('currentPrice')}</p>
            <p className="text-2xl font-semibold text-white">{numeral(currentPrice).format('0.00')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">{t('change')}</p>
            <p className={`text-xl font-semibold ${isUp ? 'text-red-500' : 'text-green-500'}`}>
              {isUp ? '+' : ''}{numeral(change).format('0.00')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">{t('changePercent')}</p>
            <p className={`text-xl font-semibold ${isUp ? 'text-red-500' : 'text-green-500'}`}>
              {isUp ? '+' : ''}{numeral(changePercent).format('0.00')}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">{t('lastUpdate')}</p>
            <p className="text-white">{stockRealtime?.updateTime ? stockRealtime.updateTime.split(' ')[1] : '-'}</p>
          </div>
        </div>
      </div>

      <div className="flex space-x-1 rounded-xl bg-[#1e1e2d] p-1 border border-[#2a2a3a]">
        <button className={clsx('w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all', activeTab === OVERVIEW_TAB ? 'bg-[#ff9500] text-white shadow' : 'text-gray-400 hover:bg-[#2a2a3a] hover:text-white')} onClick={() => setActiveTab(OVERVIEW_TAB)}>
          {t('tabs.overview')}
        </button>
        <button className={clsx('w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all', activeTab === CHART_TAB ? 'bg-[#ff9500] text-white shadow' : 'text-gray-400 hover:bg-[#2a2a3a] hover:text-white')} onClick={() => setActiveTab(CHART_TAB)}>
          {t('tabs.chart')}
        </button>
        <button className={clsx('w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all', activeTab === TRANSACTIONS_TAB ? 'bg-[#ff9500] text-white shadow' : 'text-gray-400 hover:bg-[#2a2a3a] hover:text-white')} onClick={() => setActiveTab(TRANSACTIONS_TAB)}>
          {t('tabs.transactions')}
        </button>
      </div>

      {activeTab === OVERVIEW_TAB && (
        <div className="bg-[#1e1e2d] rounded-xl p-6 border border-[#2a2a3a]">
          <h3 className="text-lg font-medium text-white mb-6">{t('tabs.overview')}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-[#151520] rounded-lg p-4">
              <p className="text-sm text-gray-400">{tOverview('shares')}</p>
              <p className="text-xl font-semibold text-white mt-1">{numeral(position.shares).format('0.00')}</p>
            </div>
            <div className="bg-[#151520] rounded-lg p-4">
              <p className="text-sm text-gray-400">{tOverview('avgCost')}</p>
              <p className="text-xl font-semibold text-white mt-1">{numeral(position.avg_cost).format('0.00')}</p>
            </div>
            <div className="bg-[#151520] rounded-lg p-4">
              <p className="text-sm text-gray-400">{tOverview('totalCost')}</p>
              <p className="text-xl font-semibold text-white mt-1">{numeral(position.total_buy - position.total_sell).format('0.00')}</p>
            </div>
            <div className="bg-[#151520] rounded-lg p-4">
              <p className="text-sm text-gray-400">{tOverview('currentValue')}</p>
              <p className="text-xl font-semibold text-white mt-1">{numeral(position.currentValue).format('0.00')}</p>
            </div>
            <div className="bg-[#151520] rounded-lg p-4">
              <p className="text-sm text-gray-400">{tOverview('totalPL')}</p>
              <p className={`text-xl font-semibold mt-1 ${position.profit >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                {position.profit >= 0 ? '+' : ''}{numeral(position.profit).format('0.00')}
              </p>
            </div>
            <div className="bg-[#151520] rounded-lg p-4">
              <p className="text-sm text-gray-400">{tOverview('plPercent')}</p>
              <p className={`text-xl font-semibold mt-1 ${position.profitPercent >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                {position.profitPercent >= 0 ? '+' : ''}{numeral(position.profitPercent).format('0.00')}%
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === CHART_TAB && (
        <div className="bg-[#1e1e2d] rounded-xl p-6 border border-[#2a2a3a]">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-4">
            <div className="flex bg-[#2a2a3a] rounded-lg p-1">
              {CHART_TYPES.map((type) => (
                <button key={type.key} onClick={() => setChartType(type.key)} className={clsx('px-3 py-1 text-xs rounded-md transition-colors', chartType === type.key ? 'bg-[#ff9500] text-white' : 'text-gray-400 hover:text-white')}>
                  {tChart(type.key)}
                </button>
              ))}
            </div>
            {chartType !== 'intraday' && (
              <StockMaSelector selectedMas={selectedMas} customMas={customMas} onTogglePreset={handleTogglePreset} onAddCustom={handleAddCustom} onRemoveCustom={handleRemoveCustom} />
            )}
          </div>
          <ReactECharts option={klineOption} style={{ height: '600px', width: '100%' }} />
        </div>
      )}

      {activeTab === TRANSACTIONS_TAB && (
        <div className="bg-[#1e1e2d] rounded-xl overflow-hidden border border-[#2a2a3a]">
          <div className="px-6 py-4 border-b border-[#2a2a3a]">
            <h3 className="text-lg font-medium text-white">{t('tabs.transactions')}</h3>
          </div>
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-400">{tTransactions('noTransactions')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#2a2a3a]">
                <thead className="bg-[#151520]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{tTransactions('date')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{tTransactions('type')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{tTransactions('shares')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{tTransactions('price')}</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">{tTransactions('amount')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{tTransactions('notes')}</th>
                  </tr>
                </thead>
                <tbody className="bg-[#1e1e2d] divide-y divide-[#2a2a3a]">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[#252535] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{new Date(tx.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={clsx('px-2 py-1 text-xs rounded font-medium', tx.transaction_type === 'buy' ? 'bg-red-900/30 text-red-400' : 'bg-green-900/30 text-green-400')}>
                          {tx.transaction_type === 'buy' ? tTransactions('buy') : tTransactions('sell')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-300">{numeral(tx.shares).format('0.00')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-300">{numeral(tx.price).format('0.00')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-300">{numeral(tx.shares * tx.price).format('0.00')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{tx.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
