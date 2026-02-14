'use client';

import numeral from 'numeral';
import { PlusIcon, ClockIcon } from '@heroicons/react/20/solid';

export interface PositionCardProps {
  position: {
    id: string;
    fund_code: string;
    fund_name: string;
    shares: number;
    avg_cost: number;
    nav: number;
    currentValue: number;
    profit: number;
    profitPercent: number;
  };
  realtimeNav?: number;
  onAddPosition: (fundCode: string, fundName: string) => void;
  onViewHistory: (fundCode: string) => void;
}

export default function PositionCard({
  position,
  realtimeNav,
  onAddPosition,
  onViewHistory,
}: PositionCardProps) {
  const isPositive = position.profit >= 0;

  return (
    <div className="bg-[#1a1a25] border border-[#2a2a3a] rounded-lg p-4 hover:border-[#3a3a4a] transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-medium text-[#e0e0e0] text-lg">{position.fund_name}</h3>
          <p className="text-sm text-gray-500 font-mono">{position.fund_code}</p>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded ${
          isPositive ? 'bg-[#ff3333]/10' : 'bg-[#33ff33]/10'
        }`}>
          <span className={`text-sm font-semibold ${isPositive ? 'text-[#ff3333]' : 'text-[#33ff33]'}`}>
            {isPositive ? '+' : ''}{position.profitPercent.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500 mb-1">持有份额</p>
          <p className="text-sm text-[#e0e0e0]">{numeral(position.shares).format('0,0.0000')}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">成本价</p>
          <p className="text-sm text-[#e0e0e0]">{numeral(position.avg_cost).format('0.000000')}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">净值</p>
          <p className="text-sm text-[#e0e0e0]">
            {realtimeNav ? numeral(realtimeNav).format('0.000000') : numeral(position.nav).format('0.000000')}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 mb-1">当前市值</p>
          <p className="text-sm text-[#e0e0e0]">{numeral(position.currentValue).format('0,0.00')}</p>
        </div>
      </div>

      {/* Profit Row */}
      <div className="flex items-center justify-between py-3 border-t border-[#2a2a3a] mb-4">
        <div>
          <p className="text-xs text-gray-500">累计收益</p>
          <p className={`text-lg font-semibold ${isPositive ? 'text-[#ff3333]' : 'text-[#33ff33]'}`}>
            {isPositive ? '+' : ''}{numeral(position.profit).format('0,0.00')}
          </p>
        </div>
        {realtimeNav && (
          <div className="text-right">
            <p className="text-xs text-gray-500">实时净值</p>
            <p className="text-sm text-[#e0e0e0]">{numeral(realtimeNav).format('0.000000')}</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onAddPosition(position.fund_code, position.fund_name)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#0d0d15] border border-[#2a2a3a] text-[#e0e0e0] hover:border-[#00ffff] hover:text-[#00ffff] rounded transition-colors text-sm font-medium"
        >
          <PlusIcon className="w-4 h-4" />
          添加持仓
        </button>
        <button
          onClick={() => onViewHistory(position.fund_code)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#0d0d15] border border-[#2a2a3a] text-[#e0e0e0] hover:border-[#ff00ff] hover:text-[#ff00ff] rounded transition-colors text-sm font-medium"
        >
          <ClockIcon className="w-4 h-4" />
          查看历史
        </button>
      </div>
    </div>
  );
}
