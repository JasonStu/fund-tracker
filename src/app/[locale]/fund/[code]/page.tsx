'use client';

import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { FundRealtimeValuation, StockRealtime, FundDetail, QuarterlyHolding, FundHolding } from '@/types';
import { useParams } from 'next/navigation';
import ReactECharts from 'echarts-for-react';
import numeral from 'numeral';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/routing';
import clsx from 'clsx';
import { SortIcon } from '@/components/SortIcon';

interface DisplayHolding extends FundHolding {
  realtime?: StockRealtime;
  status?: 'new' | 'removed' | 'unchanged';
  proportionChange?: number;
}

type SortField = 'proportion' | 'change' | 'price' | null;
type SortDirection = 'asc' | 'desc';

export default function FundDetailPage() {
  const t = useTranslations('FundDetail');
  const params = useParams();
  const code = params?.code as string;

  const LATEST_TAB = 'Latest';
  const PERFORMANCE_TAB = 'Performance';

  const [valuation, setValuation] = useState<FundRealtimeValuation | null>(null);
  const [quarterlyHoldings, setQuarterlyHoldings] = useState<QuarterlyHolding[]>([]);
  const [selectedQuarter, setSelectedQuarter] = useState<string>('');
  const [performance, setPerformance] = useState<FundDetail['performance']>(undefined);
  const [performanceTimeRange, setPerformanceTimeRange] = useState('1M'); // 1M, 3M, 6M, 1Y, 3Y, 5Y, YTD
  
  // Realtime data map: code -> StockRealtime
  const [stockRealtimeMap, setStockRealtimeMap] = useState<Map<string, StockRealtime>>(new Map());
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Sorting State
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Initial Fetch
  useEffect(() => {
    if (!code) return;

    const fetchData = async () => {
      try {
        const valRes = await axios.get(`/api/funds/realtime?code=${code}`);
        setValuation(valRes.data);

        const holdingsRes = await axios.get<FundDetail>(`/api/funds/${code}/holdings`);
        const data = holdingsRes.data;
        
        if (data.quarterlyHoldings && data.quarterlyHoldings.length > 0) {
          setQuarterlyHoldings(data.quarterlyHoldings);
          // Default to 'Latest' tab
          setSelectedQuarter(LATEST_TAB);
        } else if (data.holdings.length > 0) {
          // Fallback if no quarterly structure (should not happen with new service)
          setQuarterlyHoldings([{ quarter: data.reportDate, holdings: data.holdings }]);
          setSelectedQuarter(LATEST_TAB);
        }
        
        if (data.performance) {
          setPerformance(data.performance);
        }

        setLoading(false);
      } catch (err) {
        console.error(err);
        setError(t('error'));
        setLoading(false);
      }
    };

    fetchData();
    // Refresh valuation every 30s
    const interval = setInterval(async () => {
       try {
         const valRes = await axios.get(`/api/funds/realtime?code=${code}`);
         setValuation(valRes.data);
       } catch (e) { console.error(e); }
    }, 30000);
    return () => clearInterval(interval);
  }, [code, t]);

  // Compute Base List (without sorting)
  const baseList = useMemo(() => {
    // If "Latest" tab is selected, use the most recent quarter's holdings
    // but we will use real-time data for prices/changes.
    const effectiveQuarter = selectedQuarter === LATEST_TAB 
      ? quarterlyHoldings[0]?.quarter 
      : selectedQuarter;

    if (!effectiveQuarter || quarterlyHoldings.length === 0) return [];

    const currentIndex = quarterlyHoldings.findIndex(q => q.quarter === effectiveQuarter);
    if (currentIndex === -1) return [];

    const currentQ = quarterlyHoldings[currentIndex];
    const prevQ = quarterlyHoldings[currentIndex + 1]; // Older quarter

    const prevSet = new Set(prevQ?.holdings.map(h => h.stockCode) || []);
    const currentSet = new Set(currentQ.holdings.map(h => h.stockCode));

    // Current holdings with status and proportion change
    const currentWithStatus: DisplayHolding[] = currentQ.holdings.map(h => {
      // Find previous holding to compare proportion
      const prevHolding = prevQ?.holdings.find(p => p.stockCode === h.stockCode);
      const proportionChange = h.proportion - (prevHolding ? prevHolding.proportion : 0);
      
      return {
        ...h,
        status: !prevSet.has(h.stockCode) && prevQ ? 'new' : 'unchanged',
        proportionChange
      };
    });

    // Removed holdings
    const removedItems: DisplayHolding[] = prevQ 
      ? prevQ.holdings
          .filter(h => !currentSet.has(h.stockCode))
          .map(h => ({
            ...h,
            status: 'removed',
            proportionChange: -h.proportion // Removed means change is -proportion
          }))
      : [];

    return [...currentWithStatus, ...removedItems];
  }, [selectedQuarter, quarterlyHoldings]);

  // Fetch Realtime Data for displayed stocks
  useEffect(() => {
    if (baseList.length === 0) return;

    const fetchStockQuotes = async () => {
      const codes = baseList.map(h => h.stockCode).join(',');
      if (!codes) return;

      try {
        const stocksRes = await axios.get(`/api/stocks/realtime?codes=${codes}`);
        const newMap = new Map(stockRealtimeMap);
        stocksRes.data.stocks.forEach((s: StockRealtime) => {
           const simpleCode = s.code.replace(/^(sh|sz|hk|usr_)/, '');
           newMap.set(simpleCode, s);
        });
        setStockRealtimeMap(newMap);
      } catch (e) {
        console.error('Failed to fetch stock quotes', e);
      }
    };

    fetchStockQuotes();
  }, [baseList.map(d => d.stockCode).join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute Final Display List (Sorted)
  const sortedList = useMemo(() => {
    if (!sortField) return baseList;

    const list = [...baseList];
    list.sort((a, b) => {
      let valA = 0;
      let valB = 0;

      if (sortField === 'proportion') {
        valA = a.proportion;
        valB = b.proportion;
      } else if (sortField === 'price') {
        valA = stockRealtimeMap.get(a.stockCode)?.currentPrice || 0;
        valB = stockRealtimeMap.get(b.stockCode)?.currentPrice || 0;
      } else if (sortField === 'change') {
        valA = stockRealtimeMap.get(a.stockCode)?.changePercent || 0;
        valB = stockRealtimeMap.get(b.stockCode)?.changePercent || 0;
      }

      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });

    return list;
  }, [baseList, sortField, sortDirection, stockRealtimeMap]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };


  if (loading && !valuation) return <div className="p-8 text-center text-gray-400">{t('loading')}</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!valuation) return null;

  // Chart Data: Only show current holdings (exclude removed)
  const chartData = baseList.filter(h => h.status !== 'removed').map(h => ({
    value: h.proportion,
    name: h.stockName
  }));

  // Flat Style Option
  const pieOption = {
    color: ['#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de', '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc'],
    tooltip: {
      trigger: 'item',
      backgroundColor: '#fff',
      borderColor: '#ccc',
      textStyle: { color: '#333' }
    },
    title: {
      text: t('chartTitle'),
      left: 'center',
      top: 10,
      textStyle: {
        color: '#e0e0e0', // Keep light text for dark mode
        fontSize: 16,
        fontWeight: 'normal'
      }
    },
    legend: {
      orient: 'horizontal',
      bottom: 0,
      left: 'center',
      textStyle: { color: '#aaa' }
    },
    series: [
      {
        name: t('table.proportion'),
        type: 'pie',
        radius: ['35%', '60%'], // Donut chart
        center: ['50%', '45%'], // Center vertically in top half
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 5,
          borderColor: '#1e1e2d', // Match container background
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold',
            color: '#e0e0e0'
          }
        },
        labelLine: {
          show: false
        },
        data: chartData
      }
    ]
  };

  // Performance Chart Options
  const getPerformanceOption = () => {
    if (!performance) return {};

    const timeRanges: { [key: string]: number } = {
      '1M': 30,
      '3M': 90,
      '6M': 180,
      '1Y': 365,
      '3Y': 365 * 3,
      '5Y': 365 * 5,
      'YTD': 0 // Handled specially
    };

    const days = timeRanges[performanceTimeRange];
    let startTime = 0;

    if (performanceTimeRange === 'YTD') {
      startTime = new Date(new Date().getFullYear(), 0, 1).getTime();
    } else {
      const d = new Date();
      d.setDate(d.getDate() - days);
      startTime = d.getTime();
    }

    // Filter data first
    const filterData = (data: ({x: number} | number[])[]) => {
      // Data item can be {x, y} or [x, y]
      return data.filter(item => {
        const time = Array.isArray(item) ? item[0] : (item as {x: number}).x;
        return time >= startTime;
      });
    };

    const filteredNetWorth = filterData(performance.netWorthTrend) as {x: number, y: number, equityReturn: number}[];
    if (filteredNetWorth.length === 0) return {};

    // Helper to calculate cumulative return relative to start of period
    // Formula: (Current_Return - Start_Return)
    // Note: Since data is percentage, simple subtraction is a reasonable approximation for display
    // or strictly: ((1 + curr/100) / (1 + start/100) - 1) * 100
    const calculateRelativeReturn = (data: number[], startValue: number) => {
      return data.map(val => {
         // Use precise calculation
         const ratio = (1 + val / 100) / (1 + startValue / 100);
         return (ratio - 1) * 100;
      });
    };

    // Fund Yield Data (Recalculate based on start time)
    // performance.netWorthTrend items have 'equityReturn' which is total return since inception
    const startReturn = filteredNetWorth[0].equityReturn;
    const yieldSeriesData = filteredNetWorth.map((item) => {
        // Calculate relative return
        const ratio = (1 + item.equityReturn / 100) / (1 + startReturn / 100);
        const relativeReturn = (ratio - 1) * 100;
        return [item.x, relativeReturn];
    });

    // Comparison Series
    const comparisonSeries = performance.grandTotal.map((item: { name: string; data: [number, number][] }) => {
      const filtered = filterData(item.data) as [number, number][];
      if (filtered.length === 0) return null;
      
      const startVal = filtered[0][1];
      const relativeData = filtered.map(([time, val]) => {
          const ratio = (1 + val / 100) / (1 + startVal / 100);
          const relativeReturn = (ratio - 1) * 100;
          return [time, relativeReturn];
      });

      const nameMap: Record<string, string> = {
        '同类平均': t('peerAverage'),
        '沪深300': t('hs300'),
      };
      const name = nameMap[item.name] || item.name;
      
      return {
        name,
        type: 'line',
        // yAxisIndex: 0, // All on same axis now
        data: relativeData,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 1 }
      };
    }).filter(Boolean) as {name: string, type: string, data: [number, number][], smooth: boolean, showSymbol: boolean, lineStyle: {width: number}}[];

    const legendData = [t('yield'), ...comparisonSeries.map((s) => s.name)];

    return {
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: '#1e1e2d',
        borderColor: '#2a2a3a',
        textStyle: { color: '#e0e0e0' },
        formatter: function (params: {axisValueLabel: string, value: [number, number], color: string, seriesName: string}[]) {
            let res = `<div>${params[0].axisValueLabel}</div>`;
            params.forEach((param) => {
                const val = param.value[1];
                const color = param.color;
                const displayVal = typeof val === 'number' ? val.toFixed(2) + '%' : '-';
                res += `<div style="display:flex;justify-content:space-between;gap:10px;">
                    <span><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:${color};margin-right:5px;"></span>${param.seriesName}</span>
                    <span style="font-weight:bold">${displayVal}</span>
                </div>`;
            });
            return res;
        }
      },
      legend: {
        data: legendData,
        textStyle: { color: '#aaa' },
        bottom: 0
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'time',
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#2a2a3a' } },
        axisLabel: { 
            color: '#aaa',
            formatter: '{yyyy}-{MM}-{dd}'
        },
        splitLine: { show: false }
      },
      yAxis: [
        {
          type: 'value',
          name: t('yield'),
          position: 'left', // Move to left as primary
          axisLine: { show: true, lineStyle: { color: '#91cc75' } },
          axisLabel: { formatter: '{value} %' },
          splitLine: { lineStyle: { color: '#2a2a3a' } },
          scale: true
        }
      ],
      series: [
        {
          name: t('yield'),
          type: 'line',
          data: yieldSeriesData,
          smooth: true,
          showSymbol: false,
          lineStyle: { width: 2, color: '#91cc75' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [{ offset: 0, color: 'rgba(145, 204, 117, 0.3)' }, { offset: 1, color: 'rgba(145, 204, 117, 0.05)' }]
            }
          }
        },
        ...comparisonSeries
      ]
    };
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors">
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Portfolio
      </Link>

      {/* Header Card - Flat Style */}
      <div className="bg-[#1e1e2d] rounded-xl p-6 shadow-sm border border-[#2a2a3a]">
        <h1 className="text-2xl font-bold text-white">
          {valuation.fundName} ({valuation.fundCode})
        </h1>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-400">{t('nav')}</p>
            <p className="text-xl font-semibold text-white">{valuation.nav}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">{t('estNav')}</p>
            <p className={`text-xl font-semibold ${valuation.estimatedChange >= 0 ? 'text-red-500' : 'text-green-500'}`}>
              {numeral(valuation.estimatedNav).format('0.0000')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">{t('estChange')}</p>
            <p className={`text-xl font-semibold ${valuation.estimatedChange >= 0 ? 'text-red-500' : 'text-green-500'}`}>
              {valuation.estimatedChange >= 0 ? '+' : ''}{numeral(valuation.estimatedChangePercent).format('0.00')}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">{t('time')}</p>
            <p className="text-white">{valuation.calculationTime.split(' ')[1]}</p>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex space-x-1 rounded-xl bg-[#1e1e2d] p-1 border border-[#2a2a3a]">
        <button
          className={clsx(
            'w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all',
            selectedQuarter !== PERFORMANCE_TAB
              ? 'bg-blue-600 text-white shadow'
              : 'text-gray-400 hover:bg-[#2a2a3a] hover:text-white'
          )}
          onClick={() => setSelectedQuarter(LATEST_TAB)}
        >
          {t('topHoldingsTitle')}
        </button>
        <button
          className={clsx(
            'w-full rounded-lg py-2.5 text-sm font-medium leading-5 transition-all',
            selectedQuarter === PERFORMANCE_TAB
              ? 'bg-blue-600 text-white shadow'
              : 'text-gray-400 hover:bg-[#2a2a3a] hover:text-white'
          )}
          onClick={() => setSelectedQuarter(PERFORMANCE_TAB)}
        >
          {t('performance') || 'Performance'}
        </button>
      </div>

      {selectedQuarter === PERFORMANCE_TAB ? (
        <div className="bg-[#1e1e2d] rounded-xl p-6 border border-[#2a2a3a]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-white">{t('performance') || 'Performance Trend'}</h3>
            <div className="flex bg-[#2a2a3a] rounded-lg p-1">
              {['1M', '3M', '6M', '1Y', '3Y', '5Y', 'YTD'].map((range) => (
                <button
                  key={range}
                  onClick={() => setPerformanceTimeRange(range)}
                  className={clsx(
                    "px-3 py-1 text-xs rounded-md transition-colors",
                    performanceTimeRange === range
                      ? "bg-blue-600 text-white"
                      : "text-gray-400 hover:text-white"
                  )}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <ReactECharts option={getPerformanceOption()} style={{ height: '400px', width: '100%' }} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Holdings Table */}
          <div className="lg:col-span-2 bg-[#1e1e2d] rounded-xl overflow-hidden border border-[#2a2a3a]">
            {/* Tabs Header */}
            <div className="px-6 py-4 border-b border-[#2a2a3a] flex flex-wrap gap-2 items-center justify-between">
              <h3 className="text-lg font-medium text-white">{t('topHoldingsTitle')}</h3>
              <div className="flex gap-2 overflow-x-auto">
                <button
                  onClick={() => setSelectedQuarter(LATEST_TAB)}
                  className={clsx(
                    "px-3 py-1 text-xs rounded-full transition-colors whitespace-nowrap",
                    selectedQuarter === LATEST_TAB
                      ? "bg-blue-600 text-white"
                      : "bg-[#2a2a3a] text-gray-400 hover:bg-[#3a3a4a]"
                  )}
                >
                  {t('currentValuation') || 'Latest'}
                </button>
                {quarterlyHoldings.map((q) => (
                  <button
                    key={q.quarter}
                    onClick={() => setSelectedQuarter(q.quarter)}
                    className={clsx(
                      "px-3 py-1 text-xs rounded-full transition-colors whitespace-nowrap",
                      selectedQuarter === q.quarter
                        ? "bg-blue-600 text-white"
                        : "bg-[#2a2a3a] text-gray-400 hover:bg-[#3a3a4a]"
                    )}
                  >
                    {q.quarter}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[#2a2a3a]">
                <thead className="bg-[#151520]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.stock')}
                    </th>
                    <th 
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-white group"
                      onClick={() => handleSort('price')}
                    >
                      <div className="flex items-center justify-end">
                        {t('table.price')}
                        <SortIcon active={sortField === 'price'} direction={sortDirection} />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('table.prevClose')}
                    </th>
                    <th 
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-white group"
                      onClick={() => handleSort('change')}
                    >
                      <div className="flex items-center justify-end">
                        {t('table.change')}
                        <SortIcon active={sortField === 'change'} direction={sortDirection} />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-white group"
                      onClick={() => handleSort('proportion')}
                    >
                      <div className="flex items-center justify-end">
                        {t('table.proportion')}
                        <SortIcon active={sortField === 'proportion'} direction={sortDirection} />
                      </div>
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-[#1e1e2d] divide-y divide-[#2a2a3a]">
                  {sortedList.map((holding) => {
                    const stock = stockRealtimeMap.get(holding.stockCode);
                    const isUp = stock && stock.change >= 0;
                    const isRemoved = holding.status === 'removed';

                    return (
                      <tr key={holding.stockCode} className={clsx("hover:bg-[#252535] transition-colors", isRemoved && "opacity-50 bg-[#1a1a25]")}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div>
                              <div className={clsx("text-sm font-medium", isRemoved ? "text-gray-500 line-through" : "text-white")}>
                                {holding.stockName}
                              </div>
                              <div className="text-sm text-gray-500">{holding.stockCode}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-gray-300">
                          {stock ? stock.currentPrice.toFixed(2) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                          {stock ? stock.previousClose.toFixed(2) : '-'}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${isUp ? 'text-red-500' : 'text-green-500'}`}>
                          {stock ? (
                            <>
                              {stock.change > 0 ? '+' : ''}{numeral(stock.changePercent).format('0.00')}%
                            </>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-300">
                          <div className="flex flex-col items-end">
                            <span>{numeral(holding.proportion).format('0.00')}%</span>
                            {holding.proportionChange !== undefined && holding.proportionChange !== 0 && (
                              <span className={clsx("text-xs", holding.proportionChange > 0 ? "text-red-500" : "text-green-500")}>
                                {holding.proportionChange > 0 ? '+' : ''}
                                {numeral(holding.proportionChange).format('0.00')}%
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-xs">
                          {holding.status === 'new' && (
                            <span className="px-2 py-1 bg-green-900 text-green-300 rounded text-xs">New</span>
                          )}
                          {holding.status === 'removed' && (
                            <span className="px-2 py-1 bg-red-900 text-red-300 rounded text-xs">Removed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-[#1e1e2d] rounded-xl p-6 border border-[#2a2a3a] h-[500px]">
             <ReactECharts option={pieOption} style={{ height: '100%', width: '100%' }} />
          </div>
        </div>
      )}
    </div>
  );
}
