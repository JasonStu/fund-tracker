'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { Position, Transaction, StockRealtime } from '@/types';
import { useParams } from 'next/navigation';
import ReactECharts from 'echarts-for-react';
import numeral from 'numeral';
import clsx from 'clsx';

interface StockKlineData {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  amount: number;
}

// Time range options for chart
const TIME_RANGES = [
  { key: '1D', label: '1日', days: 1 },
  { key: '1W', label: '1周', days: 7 },
  { key: '1M', label: '1月', days: 30 },
  { key: '3M', label: '3月', days: 90 },
  { key: '1Y', label: '1年', days: 365 },
];

export default function StockDetailPage() {
  const params = useParams();
  const code = params?.code as string;

  const [position, setPosition] = useState<Position | null>(null);
  const [stockRealtime, setStockRealtime] = useState<StockRealtime | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [klineData, setKlineData] = useState<StockKlineData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Tabs
  const OVERVIEW_TAB = 'Overview';
  const CHART_TAB = 'Chart';
  const TRANSACTIONS_TAB = 'Transactions';
  const [activeTab, setActiveTab] = useState(OVERVIEW_TAB);

  // Time range for chart
  const [selectedTimeRange, setSelectedTimeRange] = useState('1M');

  // Initial Fetch
  useEffect(() => {
    if (!code) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch user position data
        const userFundsRes = await axios.get('/api/user-funds');
        const { positions: allPositions, transactions: allTransactions } = userFundsRes.data;

        // Find the stock position by code
        const stockPosition = allPositions.find(
          (p: Position) => p.code === code && p.type === 'stock'
        );
        setPosition(stockPosition || null);

        // Filter transactions for this stock
        const stockTransactions = (allTransactions as Transaction[]).filter(
          (tx) => tx.code === code && tx.type === 'stock'
        );
        setTransactions(stockTransactions);

        // Fetch realtime price
        const stockRes = await axios.get(`/api/stocks/realtime?codes=${code}`);
        if (stockRes.data.stocks && stockRes.data.stocks.length > 0) {
          setStockRealtime(stockRes.data.stocks[0]);
        }

        setLoading(false);
      } catch (err) {
        console.error(err);
        setError('Failed to load data');
        setLoading(false);
      }
    };

    fetchData();

    // Refresh realtime data every 30s
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
  }, [code]);

  // Fetch Kline data when chart tab is selected or time range changes
  useEffect(() => {
    if (activeTab !== CHART_TAB || !code) return;

    const fetchKline = async () => {
      try {
        const res = await axios.get(`/api/stocks/kline?code=${code}`);
        setKlineData(res.data.klines || []);
      } catch (err) {
        console.error('Failed to fetch kline', err);
        setKlineData([]);
      }
    };

    fetchKline();
  }, [activeTab, code, selectedTimeRange]);

  // Filter kline data based on selected time range
  const filteredKlineData = useMemo(() => {
    const range = TIME_RANGES.find((r) => r.key === selectedTimeRange);
    if (!range || klineData.length === 0) return klineData;

    const now = new Date();
    const cutoff = new Date(now.getTime() - range.days * 24 * 60 * 60 * 1000);
    return klineData.filter((k) => new Date(k.date) >= cutoff);
  }, [klineData, selectedTimeRange]);

  // Chart Options for K-line
  const klineOption = useMemo(() => {
    if (filteredKlineData.length === 0) return {};

    const dates = filteredKlineData.map((k) => k.date);
    const ohlc = filteredKlineData.map((k) => [k.open, k.close, k.low, k.high]);

    // Color scheme
    const upColor = '#ff3333';
    const downColor = '#00cc00';
    const borderUpColor = '#ff3333';
    const borderDownColor = '#00cc00';

    const categoryData = dates;
    const values = ohlc;

    // Calculate MA5, MA10, MA20
    const calculateMA = (dayCount: number, data: number[][]) => {
      const result: (number | null)[] = [];
      for (let i = 0; i < data.length; i++) {
        if (i < dayCount) {
          result.push(null);
          continue;
        }
        let sum = 0;
        for (let j = 0; j < dayCount; j++) {
          sum += data[i - j][1]; // Close price
        }
        result.push(sum / dayCount);
      }
      return result;
    };

    const ma5 = calculateMA(5, ohlc);
    const ma10 = calculateMA(10, ohlc);
    const ma20 = calculateMA(20, ohlc);

    const data0 = filteredKlineData.map((k) => {
      const isUp = k.close >= k.open;
      return {
        value: k.volume,
        itemStyle: {
          color: isUp ? upColor : downColor,
          color0: isUp ? borderUpColor : borderDownColor,
          borderColor: isUp ? borderUpColor : borderDownColor,
          borderColor0: isUp ? upColor : downColor,
        },
      };
    });

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: '#1e1e2d',
        borderColor: '#2a2a3a',
        textStyle: { color: '#e0e0e0' },
        formatter: function (params: { axisValue: string; value: number[] }[]) {
          const klineParam = params.find((p) => p.value && p.value.length >= 4);
          if (!klineParam) return '';
          const data = klineParam.value;
          const date = klineParam.axisValue;
          return `<div style="padding:5px;">
            <div>${date}</div>
            <div>开盘: ${data[1]}</div>
            <div>收盘: ${data[2]}</div>
            <div>最低: ${data[3]}</div>
            <div>最高: ${data[4]}</div>
            <div>成交量: ${numeral(data[5]).format('0.00')}</div>
          </div>`;
        },
      },
      grid: [
        {
          left: '10%',
          right: '10%',
          top: '10%',
          height: '50%',
        },
        {
          left: '10%',
          right: '10%',
          top: '65%',
          height: '15%',
        },
      ],
      xAxis: [
        {
          type: 'category',
          data: categoryData,
          boundaryGap: true,
          axisLine: { lineStyle: { color: '#2a2a3a' } },
          axisLabel: { color: '#aaa' },
          splitLine: { show: false },
        },
        {
          type: 'category',
          gridIndex: 1,
          data: categoryData,
          boundaryGap: true,
          axisLine: { lineStyle: { color: '#2a2a3a' } },
          axisLabel: { show: false },
          splitLine: { show: false },
        },
      ],
      yAxis: [
        {
          scale: true,
          splitArea: { show: false },
          axisLine: { lineStyle: { color: '#2a2a3a' } },
          axisLabel: { color: '#aaa' },
          splitLine: { lineStyle: { color: '#2a2a3a' } },
        },
        {
          scale: true,
          gridIndex: 1,
          splitNumber: 2,
          axisLine: { show: false },
          axisLabel: { show: false },
          splitLine: { show: false },
        },
      ],
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0, 1],
          start: 50,
          end: 100,
        },
      ],
      series: [
        {
          name: 'K线',
          type: 'candlestick',
          data: values,
          itemStyle: {
            color: upColor,
            color0: downColor,
            borderColor: borderUpColor,
            borderColor0: borderDownColor,
          },
        },
        {
          name: 'MA5',
          type: 'line',
          data: ma5,
          smooth: true,
          lineStyle: { opacity: 0.5 },
          symbol: 'none',
        },
        {
          name: 'MA10',
          type: 'line',
          data: ma10,
          smooth: true,
          lineStyle: { opacity: 0.5 },
          symbol: 'none',
        },
        {
          name: 'MA20',
          type: 'line',
          data: ma20,
          smooth: true,
          lineStyle: { opacity: 0.5 },
          symbol: 'none',
        },
        {
          name: 'Volume',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: data0,
        },
      ],
    };
  }, [filteredKlineData]);

  if (loading && !position) {
    return <div className="p-8 text-center text-gray-400">Loading...</div>;
  }
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!position) {
    return (
      <div className="p-8 text-center text-gray-400">
        <div>Stock not found</div>
        <Link href="/" className="text-[#ff9500] hover:underline mt-4 inline-block">
          Back to Portfolio
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
      {/* Back Button */}
      <Link href="/" className="inline-flex items-center gap-2 text-[#ff9500] hover:text-[#ffaa33] transition-colors">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Portfolio
      </Link>

      {/* Header Card */}
      <div className="bg-[#1e1e2d] rounded-xl p-6 shadow-sm border border-[#2a2a3a]">
        <h1 className="text-2xl font-bold text-white">
          {position.name} ({position.code})
        </h1>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-400">Current Price</p>
            <p className="text-2xl font-semibold text-white">{numeral(currentPrice).format('0.00')}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Change</p>
            <p className={`text-xl font-semibold ${isUp ? 'text-red-500' : 'text-green-500'}`}>
              {isUp ? '+' : ''}{numeral(change).format('0.00')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Change %</p>
            <p className={`text-xl font-semibold ${isUp ? 'text-red-500' : 'text-green-500'}`}>
              {isUp ? '+' : ''}{numeral(changePercent).format('0.00')}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Last Update</p>
            <p className="text-white">
              {stockRealtime?.updateTime ? stockRealtime.updateTime.split(' ')[1] : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex space-x-1 rounded-xl bg-[#1e1e2d] p-1 border border-[#2a2a3a]">
        <button
          className={clsx(
            'w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all',
            activeTab === OVERVIEW_TAB
              ? 'bg-[#ff9500] text-white shadow'
              : 'text-gray-400 hover:bg-[#2a2a3a] hover:text-white'
          )}
          onClick={() => setActiveTab(OVERVIEW_TAB)}
        >
          Overview
        </button>
        <button
          className={clsx(
            'w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all',
            activeTab === CHART_TAB
              ? 'bg-[#ff9500] text-white shadow'
              : 'text-gray-400 hover:bg-[#2a2a3a] hover:text-white'
          )}
          onClick={() => setActiveTab(CHART_TAB)}
        >
          Chart
        </button>
        <button
          className={clsx(
            'w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all',
            activeTab === TRANSACTIONS_TAB
              ? 'bg-[#ff9500] text-white shadow'
              : 'text-gray-400 hover:bg-[#2a2a3a] hover:text-white'
          )}
          onClick={() => setActiveTab(TRANSACTIONS_TAB)}
        >
          Transactions
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === OVERVIEW_TAB && (
        <div className="bg-[#1e1e2d] rounded-xl p-6 border border-[#2a2a3a]">
          <h3 className="text-lg font-medium text-white mb-6">Position Overview</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-[#151520] rounded-lg p-4">
              <p className="text-sm text-gray-400">Shares</p>
              <p className="text-xl font-semibold text-white mt-1">
                {numeral(position.shares).format('0.00')}
              </p>
            </div>
            <div className="bg-[#151520] rounded-lg p-4">
              <p className="text-sm text-gray-400">Avg Cost</p>
              <p className="text-xl font-semibold text-white mt-1">
                {numeral(position.avg_cost).format('0.00')}
              </p>
            </div>
            <div className="bg-[#151520] rounded-lg p-4">
              <p className="text-sm text-gray-400">Total Cost</p>
              <p className="text-xl font-semibold text-white mt-1">
                {numeral(position.total_buy - position.total_sell).format('0.00')}
              </p>
            </div>
            <div className="bg-[#151520] rounded-lg p-4">
              <p className="text-sm text-gray-400">Current Value</p>
              <p className="text-xl font-semibold text-white mt-1">
                {numeral(position.currentValue).format('0.00')}
              </p>
            </div>
            <div className="bg-[#151520] rounded-lg p-4">
              <p className="text-sm text-gray-400">Total P/L</p>
              <p className={`text-xl font-semibold mt-1 ${position.profit >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                {position.profit >= 0 ? '+' : ''}{numeral(position.profit).format('0.00')}
              </p>
            </div>
            <div className="bg-[#151520] rounded-lg p-4">
              <p className="text-sm text-gray-400">P/L %</p>
              <p className={`text-xl font-semibold mt-1 ${position.profitPercent >= 0 ? 'text-red-500' : 'text-green-500'}`}>
                {position.profitPercent >= 0 ? '+' : ''}{numeral(position.profitPercent).format('0.00')}%
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === CHART_TAB && (
        <div className="bg-[#1e1e2d] rounded-xl p-6 border border-[#2a2a3a]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-white">K-Line Chart</h3>
            <div className="flex bg-[#2a2a3a] rounded-lg p-1">
              {TIME_RANGES.map((range) => (
                <button
                  key={range.key}
                  onClick={() => setSelectedTimeRange(range.key)}
                  className={clsx(
                    "px-3 py-1 text-xs rounded-md transition-colors",
                    selectedTimeRange === range.key
                      ? "bg-[#ff9500] text-white"
                      : "text-gray-400 hover:text-white"
                  )}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
          <ReactECharts option={klineOption} style={{ height: '500px', width: '100%' }} />
        </div>
      )}

      {activeTab === TRANSACTIONS_TAB && (
        <div className="bg-[#1e1e2d] rounded-xl overflow-hidden border border-[#2a2a3a]">
          <div className="px-6 py-4 border-b border-[#2a2a3a]">
            <h3 className="text-lg font-medium text-white">Transaction History</h3>
          </div>
          {transactions.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No transactions yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#2a2a3a]">
                <thead className="bg-[#151520]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shares
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-[#1e1e2d] divide-y divide-[#2a2a3a]">
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[#252535] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={clsx(
                            "px-2 py-1 text-xs rounded font-medium",
                            tx.transaction_type === 'buy'
                              ? "bg-red-900/30 text-red-400"
                              : "bg-green-900/30 text-green-400"
                          )}
                        >
                          {tx.transaction_type === 'buy' ? 'Buy' : 'Sell'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-300">
                        {numeral(tx.shares).format('0.00')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-300">
                        {numeral(tx.price).format('0.00')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-300">
                        {numeral(tx.shares * tx.price).format('0.00')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {tx.notes || '-'}
                      </td>
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
