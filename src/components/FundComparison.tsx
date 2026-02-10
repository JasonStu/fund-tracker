import React from 'react';
import ReactECharts from 'echarts-for-react';
import { FundDetail } from '@/types';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/20/solid';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  funds: FundDetail[];
}

export default function FundComparison({ isOpen, onClose, funds }: Props) {
  // Prepare data for Scale Chart
  const scaleData = funds.map(fund => {
    const scaleStr = fund.fundScale || '0';
    const match = scaleStr.match(/([\d.]+)/);
    const value = match ? parseFloat(match[1]) : 0;
    return {
      name: fund.name,
      value: value,
      original: scaleStr
    };
  });

  const scaleOption = {
    backgroundColor: 'transparent',
    tooltip: { 
      trigger: 'axis',
      backgroundColor: '#1a1a25',
      borderColor: '#2a2a3a',
      textStyle: { color: '#e0e0e0' }
    },
    xAxis: { 
      type: 'category', 
      data: scaleData.map(d => d.name.length > 6 ? d.name.slice(0, 6) + '...' : d.name), 
      axisLabel: { color: '#e0e0e0', rotate: 0, interval: 0 },
      axisLine: { lineStyle: { color: '#2a2a3a' } }
    },
    yAxis: { 
      type: 'value', 
      name: '亿元',
      nameTextStyle: { color: '#gray' },
      axisLabel: { color: '#e0e0e0' },
      splitLine: { lineStyle: { color: '#2a2a3a' } }
    },
    series: [{
      data: scaleData.map(d => d.value),
      type: 'bar',
      itemStyle: { color: '#00ffff' },
      barWidth: '40%'
    }],
    grid: { bottom: 30, top: 40, left: 50, right: 20 }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-6xl rounded bg-[#1a1a25] p-6 text-white border border-[#2a2a3a] max-h-[90vh] overflow-y-auto shadow-2xl shadow-cyan-900/20">
          <div className="flex justify-between items-center mb-6 border-b border-[#2a2a3a] pb-4">
            <Dialog.Title className="text-xl font-bold flex items-center gap-2">
              <span className="text-[#00ffff]">Fund Comparison</span>
            </Dialog.Title>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {/* Scale Comparison */}
            <div className="panel-metal p-4 rounded bg-[#0d0d15]">
              <h3 className="text-lg font-semibold mb-4 text-[#e0e0e0] border-l-4 border-[#00ffff] pl-3">
                Fund Scale (Total Assets)
              </h3>
              <ReactECharts option={scaleOption} style={{ height: '350px' }} theme="dark" />
            </div>

            {/* Holdings Comparison */}
            <div className="panel-metal p-4 rounded bg-[#0d0d15]">
              <h3 className="text-lg font-semibold mb-4 text-[#e0e0e0] border-l-4 border-[#ff00ff] pl-3">
                Top 10 Holdings
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-[#1a1a25]">
                      <th className="py-3 px-4 font-medium text-gray-400 border border-[#2a2a3a]">Rank</th>
                      {funds.map(fund => (
                        <th key={fund.code} className="py-3 px-4 font-medium text-[#e0e0e0] border border-[#2a2a3a] min-w-[200px]">
                          <div className="line-clamp-1" title={fund.name}>{fund.name}</div>
                          <div className="text-xs text-gray-500 font-mono mt-1">{fund.code}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 10 }).map((_, idx) => (
                      <tr key={idx} className="hover:bg-[#1a1a25]/50 transition-colors">
                        <td className="py-3 px-4 text-center text-gray-500 border border-[#2a2a3a] bg-[#12121a]">
                          {idx + 1}
                        </td>
                        {funds.map(fund => {
                          const holding = fund.holdings[idx];
                          return (
                            <td key={fund.code} className="py-3 px-4 border border-[#2a2a3a] align-top">
                              {holding ? (
                                <div className="flex justify-between items-start gap-2">
                                  <div className="text-[#e0e0e0] font-medium">{holding.stockName}</div>
                                  <div className="text-xs text-[#00ffff] font-mono whitespace-nowrap bg-[#00ffff]/10 px-1 rounded">
                                    {holding.proportion}%
                                  </div>
                                </div>
                              ) : (
                                <span className="text-gray-700">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
