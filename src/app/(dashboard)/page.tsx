'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import { Combobox } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';
import { Position, Transaction, InvestmentType } from '@/types';
import numeral from 'numeral';
import { useTranslations } from 'next-intl';
import TransactionModal from '@/components/TransactionModal';
import AddPositionModal from '@/components/AddPositionModal';
import TransactionHistoryModal from '@/components/TransactionHistoryModal';
import { useApi } from '@/lib/hooks/useApi';
import Link from 'next/link';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type SearchResult = { code: string; name: string; type: InvestmentType };

interface SelectedPosition {
  id: string;
  code: string;
  name: string;
  type: InvestmentType;
  nav: number;
}

// 赛博朋克风格总览卡片
function PortfolioOverview({
  positions,
}: {
  positions: Position[];
}) {
  const funds = positions.filter(p => p.type === 'fund');
  const stocks = positions.filter(p => p.type === 'stock');

  const fundValue = funds.reduce((sum, p) => sum + (p.currentValue || 0), 0);
  const stockValue = stocks.reduce((sum, p) => sum + (p.currentValue || 0), 0);
  const totalValue = fundValue + stockValue;

  const fundCost = funds.reduce((sum, p) => sum + (p.total_buy || 0), 0);
  const stockCost = stocks.reduce((sum, p) => sum + (p.total_buy || 0), 0);
  const totalCost = fundCost + stockCost;

  const totalProfit = totalValue - totalCost;
  const totalProfitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  const formatValue = (val: number) => numeral(val).format('¥0,0.00');
  const formatPercent = (val: number) => val >= 0 ? `+${numeral(val).format('0.00')}%` : numeral(val).format('0.00%');

  return (
    <div className="relative overflow-hidden rounded-none bg-gradient-to-br from-[#0d0d15] via-[#12121a] to-[#0d0d15] border border-[#2a2a3a] p-6 mb-6">
      {/* 背景装饰 - 网格线条 */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(to right, #00ffff 1px, transparent 1px),
            linear-gradient(to bottom, #00ffff 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* 角落装饰 */}
      <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-[#00ffff] opacity-50" />
      <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-[#ff00ff] opacity-50" />

      <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-6">
        {/* 总市值 */}
        <div className="text-center">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">总持仓市值</div>
          <div className="text-2xl font-bold text-[#e0e0e0] font-mono tracking-tight">
            {formatValue(totalValue)}
          </div>
        </div>

        {/* 基金市值 */}
        <div className="text-center border-l border-[#2a2a3a]">
          <div className="text-xs text-[#00ffff] uppercase tracking-wider mb-2 flex items-center justify-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            基金
          </div>
          <div className="text-xl font-semibold text-[#00ffff] font-mono">
            {formatValue(fundValue)}
          </div>
          <div className="text-xs text-gray-500 mt-1">{funds.length} 个持仓</div>
        </div>

        {/* 股票市值 */}
        <div className="text-center border-l border-[#2a2a3a]">
          <div className="text-xs text-[#ff9500] uppercase tracking-wider mb-2 flex items-center justify-center gap-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            股票
          </div>
          <div className="text-xl font-semibold text-[#ff9500] font-mono">
            {formatValue(stockValue)}
          </div>
          <div className="text-xs text-gray-500 mt-1">{stocks.length} 个持仓</div>
        </div>

        {/* 总收益 */}
        <div className="text-center border-l border-[#2a2a3a]">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">累计收益</div>
          <div className={`text-xl font-semibold font-mono ${
            totalProfit >= 0 ? 'text-[#00ffff]' : 'text-[#ff3333]'
          }`}>
            {totalProfit >= 0 ? '+' : ''}{formatValue(totalProfit)}
          </div>
          <div className={`text-xs mt-1 ${
            totalProfitPercent >= 0 ? 'text-[#00ffff]' : 'text-[#ff3333]'
          }`}>
            {formatPercent(totalProfitPercent)}
          </div>
        </div>
      </div>
    </div>
  );
}

// Tab 切换组件
function TabSwitcher({
  activeTab,
  onTabChange,
  fundCount,
  stockCount,
}: {
  activeTab: 'fund' | 'stock';
  onTabChange: (tab: 'fund' | 'stock') => void;
  fundCount: number;
  stockCount: number;
}) {
  return (
    <div className="flex items-center gap-1 px-6 py-3 bg-[#12121a] border-b border-[#2a2a3a]">
      {/* 基金 Tab */}
      <button
        onClick={() => onTabChange('fund')}
        className={`relative px-4 py-2 font-medium text-base transition-colors duration-200 ${
          activeTab === 'fund' ? 'text-[#00ffff]' : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <div className="flex items-center gap-2">
          <svg className={`w-4 h-4 ${activeTab === 'fund' ? 'text-[#00ffff]' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>基金</span>
          <span className="text-xs text-gray-500">({fundCount})</span>
        </div>
        {activeTab === 'fund' && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00ffff]" />
        )}
      </button>

      {/* 股票 Tab */}
      <button
        onClick={() => onTabChange('stock')}
        className={`relative px-4 py-2 font-medium text-base transition-colors duration-200 ${
          activeTab === 'stock' ? 'text-[#ff9500]' : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <div className="flex items-center gap-2">
          <svg className={`w-4 h-4 ${activeTab === 'stock' ? 'text-[#ff9500]' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <span>股票</span>
          <span className="text-xs text-gray-500">({stockCount})</span>
        </div>
        {activeTab === 'stock' && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#ff9500]" />
        )}
      </button>
    </div>
  );
}

// 基金卡片组件
function FundCard({
  position,
  onAddPosition,
  onDelete,
  onViewHistory,
}: {
  position: Position;
  onAddPosition: (code: string, name: string, type: InvestmentType) => void;
  onDelete: (id: string, name: string) => void;
  onViewHistory: (code: string, name: string, type: InvestmentType) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: position.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const nav = position.estimatedNav || position.nav || 0;
  const currentValue = position.shares * nav;
  const totalCost = position.total_buy;
  const profit = currentValue - totalCost;
  const profitPercent = totalCost > 0 ? (profit / totalCost) * 100 : 0;

  return (
    <div ref={setNodeRef} style={style} className="bg-gradient-to-br from-[#0d0d15] to-[#12121a] border border-[#2a2a3a] hover:border-[#00ffff] transition-all duration-300 overflow-hidden">
      {/* 卡片内容 */}
      <div className="p-4">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-4 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-[#1a1a25] border border-[#00ffff] rounded flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-[#00ffff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="min-w-0">
              <Link href={`/fund/${position.code}`} className="font-medium text-[#e0e0e0] hover:text-[#00ffff] transition-colors block truncate" title={position.name}>
                {position.name}
              </Link>
              <div className="text-xs text-gray-500 truncate">{position.code}</div>
            </div>
          </div>
          {/* 拖拽手柄 */}
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-gray-500 hover:text-[#00ffff] shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </div>
        </div>

        {/* 数据网格 */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <div className="text-xs text-gray-500">持有份额</div>
            <div className="text-sm text-[#e0e0e0]">{numeral(position.shares).format('0,0.00')}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">成本价</div>
            <div className="text-sm text-[#e0e0e0]">{numeral(position.avg_cost).format('0.0000')}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">当前净值</div>
            <div className="text-sm text-[#e0e0e0]">{numeral(nav).format('0.0000')}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">持仓市值</div>
            <div className="text-sm text-[#00ffff]">{numeral(currentValue).format('0,0.00')}</div>
          </div>
          <div className="col-span-2">
            <div className="text-xs text-gray-500">收益率</div>
            <div className={`text-lg font-semibold ${profitPercent >= 0 ? 'text-[#00ffff]' : 'text-[#ff3333]'}`}>
              {profitPercent >= 0 ? '+' : ''}{numeral(profitPercent).format('0.00')}%
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2 pt-3 border-t border-[#2a2a3a]">
          <button onClick={() => onViewHistory(position.code, position.name, position.type)} className="flex-1 py-2 text-xs text-gray-400 hover:text-[#ffff00] hover:bg-[#1a1a25] rounded transition-colors flex items-center justify-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            记录
          </button>
          <button onClick={() => onAddPosition(position.code, position.name, position.type)} className="flex-1 py-2 text-xs text-gray-400 hover:text-[#00ffff] hover:bg-[#1a1a25] rounded transition-colors flex items-center justify-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            加减仓
          </button>
          <button onClick={() => onDelete(position.id, position.name)} className="flex-1 py-2 text-xs text-gray-400 hover:text-[#ff3333] hover:bg-[#1a1a25] rounded transition-colors flex items-center justify-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            删除
          </button>
        </div>
      </div>
    </div>
  );
}

// 股票卡片组件 - 详细版
function StockCard({
  position,
  onAddPosition,
  onDelete,
  onViewHistory,
}: {
  position: Position;
  onAddPosition: (code: string, name: string, type: InvestmentType) => void;
  onDelete: (id: string, name: string) => void;
  onViewHistory: (code: string, name: string, type: InvestmentType) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: position.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const currentPrice = position.estimatedNav || position.nav || 0;
  const currentValue = position.shares * currentPrice;
  const totalCost = position.total_buy;
  const profit = currentValue - totalCost;
  const profitPercent = totalCost > 0 ? (profit / totalCost) * 100 : 0;

  // 日涨跌幅（使用 estimatedChangePercent 或从 API 获取）
  const dayChange = position.estimatedChange || 0;
  const dayChangePercent = position.estimatedChangePercent || 0;

  // 日收益 = 持仓数量 * 日涨跌
  const dayProfit = position.shares * dayChange;
  const isUp = dayChangePercent >= 0;

  return (
    <div ref={setNodeRef} style={style} className="bg-gradient-to-br from-[#0d0d15] to-[#12121a] border border-[#2a2a3a] hover:border-[#ff9500] transition-all duration-300 overflow-hidden">
      {/* 卡片内容 */}
      <div className="p-4">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-4 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 bg-[#1a1a25] border border-[#ff9500] rounded flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-[#ff9500]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div className="min-w-0">
              <Link href={`/stock/${position.code}`} className="font-medium text-[#e0e0e0] hover:text-[#ff9500] transition-colors block truncate" title={position.name}>
                {position.name}
              </Link>
              <div className="text-xs text-gray-500 truncate">{position.code}</div>
            </div>
          </div>
          {/* 拖拽手柄 */}
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing p-1 text-gray-500 hover:text-[#ff9500] shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
            </svg>
          </div>
        </div>

        {/* 数据网格 */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <div className="text-xs text-gray-500">持股数</div>
            <div className="text-sm text-[#e0e0e0]">{numeral(position.shares).format('0,0')}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">买入均价</div>
            <div className="text-sm text-[#e0e0e0]">{numeral(position.avg_cost).format('0.00')}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">当前股价</div>
            <div className="text-sm text-[#e0e0e0]">{numeral(currentPrice).format('0.00')}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">日涨跌</div>
            <div className={`text-sm font-semibold ${isUp ? 'text-[#ff3333]' : 'text-[#33ff33]'}`}>
              {isUp ? '+' : ''}{numeral(dayChangePercent).format('0.00')}%
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">日收益</div>
            <div className={`text-sm font-semibold ${dayProfit >= 0 ? 'text-[#ff3333]' : 'text-[#33ff33]'}`}>
              {dayProfit >= 0 ? '+' : ''}{numeral(dayProfit).format('0,0.00')}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">持仓总额</div>
            <div className="text-sm text-[#ff9500] font-medium">{numeral(currentValue).format('0,0.00')}</div>
          </div>
          <div className="col-span-3">
            <div className="text-xs text-gray-500">总收益</div>
            <div className={`text-lg font-semibold ${profitPercent >= 0 ? 'text-[#ff3333]' : 'text-[#33ff33]'}`}>
              {profitPercent >= 0 ? '+' : ''}{numeral(profitPercent).format('0.00')}%
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2 pt-3 border-t border-[#2a2a3a]">
          <button onClick={() => onViewHistory(position.code, position.name, position.type)} className="flex-1 py-2 text-xs text-gray-400 hover:text-[#ffff00] hover:bg-[#1a1a25] rounded transition-colors flex items-center justify-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            记录
          </button>
          <button onClick={() => onAddPosition(position.code, position.name, position.type)} className="flex-1 py-2 text-xs text-gray-400 hover:text-[#ff9500] hover:bg-[#1a1a25] rounded transition-colors flex items-center justify-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            加减仓
          </button>
          <button onClick={() => onDelete(position.id, position.name)} className="flex-1 py-2 text-xs text-gray-400 hover:text-[#ff3333] hover:bg-[#1a1a25] rounded transition-colors flex items-center justify-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            删除
          </button>
        </div>
      </div>
    </div>
  );
}

// 板块标题组件
function SectionHeader({
  title,
  icon,
  color,
  count,
}: {
  title: string;
  icon: React.ReactNode;
  color: string;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded flex items-center justify-center border ${color} bg-[#1a1a25]`}>
          {icon}
        </div>
        <h2 className="text-lg font-semibold text-[#e0e0e0]">{title}</h2>
        <span className="text-xs px-2 py-0.5 bg-[#2a2a3a] text-gray-400 rounded">
          {count} 个持仓
        </span>
      </div>
    </div>
  );
}

// 空状态组件
function EmptyState({ type }: { type: 'fund' | 'stock' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 bg-[#1a1a25] border border-[#2a2a3a] rounded-full flex items-center justify-center mb-4">
        {type === 'fund' ? (
          <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : (
          <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        )}
      </div>
      <p className="text-gray-500">
        {type === 'fund' ? '暂无基金持仓' : '暂无股票持仓'}
      </p>
      <p className="text-gray-600 text-sm mt-1">
        使用上方搜索框添加
      </p>
    </div>
  );
}

export default function Home() {
  const t = useTranslations('Home');
  const [positions, setPositions] = useState<Position[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [pendingResult, setPendingResult] = useState<SearchResult | null>(null);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<SelectedPosition | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyPosition, setHistoryPosition] = useState<{ code: string; name: string; type: InvestmentType } | null>(null);
  const [activeTab, setActiveTab] = useState<'fund' | 'stock'>('fund');

  // 添加持仓的 API hook
  const { loading: addingPosition, execute: addPosition } = useApi(
    async (data: { type: string; code: string; name: string; shares: number; cost: number }) => {
      return await apiClient.post('/user-funds', data);
    },
    {
      onSuccess: () => {
        fetchPositions();
        setAddModalOpen(false);
        setPendingResult(null);
      },
    }
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent, type: 'fund' | 'stock') => {
    const { active, over } = event;
    const filteredPositions = positions.filter(p => p.type === type);

    if (over && active.id !== over.id) {
      const oldIndex = filteredPositions.findIndex((p) => p.id === active.id);
      const newIndex = filteredPositions.findIndex((p) => p.id === over.id);

      // 更新排序
      const newPositions = arrayMove(filteredPositions, oldIndex, newIndex);

      // 合并回原数组（保持另一种类型的顺序）
      const otherPositions = positions.filter(p => p.type !== type);
      const mergedPositions = type === 'fund'
        ? [...newPositions, ...otherPositions]
        : [...otherPositions, ...newPositions];

      setPositions(mergedPositions);

      try {
        await apiClient.put('/user-funds/sort', { items: newPositions.map((p, index) => ({
          id: p.id,
          sort_order: index,
        })) });
      } catch (e) {
        console.error('Failed to save sort order', e);
        await fetchPositions();
      }
    }
  };

  const fetchPositions = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<{ positions: Position[]; transactions: Transaction[] }>('/user-funds');
      setPositions(res.data?.positions || []);
      setTransactions(res.data?.transactions || []);
    } catch (e) {
      console.error('Failed to fetch positions', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPositions();
  }, []);

  useEffect(() => {
    if (query.length < 1) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const res = await apiClient.get<{ results: SearchResult[] }>(`/search?q=${encodeURIComponent(query)}`);
        setSearchResults(res.data?.results || []);
      } catch (e) {
        console.error(e);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const addResult = (result: SearchResult | null) => {
    if (result) {
      setPendingResult(result);
      setAddModalOpen(true);
    }
    setQuery('');
    setSearchResults([]);
  };

  const handleAddPositionConfirm = async ({ shares, cost }: { shares: number; cost: number }) => {
    if (!pendingResult) return;
    await addPosition({
      type: pendingResult.type,
      code: pendingResult.code,
      name: pendingResult.name,
      shares: shares || 0,
      cost: cost || 0,
    });
  };

  const handleAddPosition = (code: string, name: string, type: InvestmentType) => {
    const position = positions.find(p => p.code === code);
    if (position) {
      setSelectedPosition({
        id: position.id,
        code,
        name,
        type,
        nav: position.estimatedNav || position.nav || 0,
      });
      setTxModalOpen(true);
    }
  };

  const handleViewHistory = (code: string, name: string, type: InvestmentType) => {
    setHistoryPosition({ code, name, type });
    setHistoryModalOpen(true);
  };

  const handleTransactionSubmit = async (data: {
    type: 'buy' | 'sell';
    shares: number;
    price: number;
    notes?: string;
  }) => {
    if (!selectedPosition) return;
    try {
      await apiClient.post('/user-funds/transactions', {
        fund_id: selectedPosition.id,
        type: data.type,
        shares: data.shares,
        price: data.price,
        notes: data.notes,
      });
      await fetchPositions();
    } catch (e) {
      console.error('Failed to submit transaction', e);
    }
    setTxModalOpen(false);
    setSelectedPosition(null);
  };

  const requestDeletePosition = (positionId: string, name: string) => {
    setPendingDelete({ id: positionId, name });
    setDeleteConfirmOpen(true);
  };

  const confirmDeletePosition = async () => {
    if (!pendingDelete) return;
    try {
      await apiClient.delete(`/user-funds/positions/${pendingDelete.id}`);
      await fetchPositions();
    } catch (e) {
      console.error('Failed to remove position', e);
    }
    setDeleteConfirmOpen(false);
    setPendingDelete(null);
  };

  const funds = positions.filter(p => p.type === 'fund');
  const stocks = positions.filter(p => p.type === 'stock');

  return (
    <div className="space-y-6">
      {/* 顶部总览卡片 */}
      <PortfolioOverview positions={positions} />

      {/* 搜索区域 */}
      <div className="relative bg-gradient-to-br from-[#0d0d15] via-[#12121a] to-[#0d0d15] border border-[#2a2a3a] rounded-none p-5">
        <div className="absolute top-0 left-0 w-12 h-12 border-l-2 border-t-2 border-[#00ffff] opacity-30" />
        <div className="absolute bottom-0 right-0 w-12 h-12 border-r-2 border-b-2 border-[#ff00ff] opacity-30" />

        <div className="relative flex items-center gap-3">
          <div className="w-8 h-8 bg-[#1a1a25] border border-[#00ffff] rounded flex items-center justify-center">
            <svg className="w-4 h-4 text-[#00ffff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <Combobox onChange={addResult}>
              <div className="relative">
                <Combobox.Input
                  className="w-full bg-transparent border-none py-2 text-[#e0e0e0] placeholder-gray-500 focus:ring-0 text-lg"
                  displayValue={(result: SearchResult) => result?.name || ''}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索基金或股票代码..."
                />
                <Combobox.Button className="absolute inset-y-0 right-0 flex items-center">
                  <ChevronUpDownIcon className="h-5 w-5 text-gray-500" />
                </Combobox.Button>
              </div>
              <Combobox.Options className="absolute mt-2 max-h-60 w-full overflow-auto bg-[#12121a] border border-[#2a2a3a] shadow-xl py-1 z-30 rounded-none">
                {searchResults.length === 0 && query !== '' ? (
                  <div className="relative cursor-default select-none py-3 px-4 text-gray-500 text-center text-sm">
                    未找到相关结果
                  </div>
                ) : (
                  searchResults.map((result) => (
                    <Combobox.Option
                      key={`${result.type}-${result.code}`}
                      className={({ active }) =>
                        `relative cursor-pointer select-none py-3 pl-4 pr-4 transition-colors ${
                          active ? 'bg-[#1a1a25]' : ''
                        }`
                      }
                      value={result}
                    >
                      {({ selected }) => (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              result.type === 'stock'
                                ? 'bg-[#ff9500]/20 text-[#ff9500]'
                                : 'bg-[#00ffff]/20 text-[#00ffff]'
                            }`}>
                              {result.type === 'stock' ? '股票' : '基金'}
                            </span>
                            <div>
                              <div className="text-sm font-medium text-[#e0e0e0]">{result.name}</div>
                              <div className="text-xs text-gray-500 mt-0.5">{result.code}</div>
                            </div>
                          </div>
                          {selected && (
                            <CheckIcon className="h-5 w-5 text-[#00ffff]" />
                          )}
                        </div>
                      )}
                    </Combobox.Option>
                  ))
                )}
              </Combobox.Options>
            </Combobox>
          </div>
        </div>
      </div>

      {/* Tab 切换器 */}
      <TabSwitcher
        activeTab={activeTab}
        onTabChange={setActiveTab}
        fundCount={funds.length}
        stockCount={stocks.length}
      />

      {/* Tab 内容区域 */}
      <div className="p-4">
        {activeTab === 'fund' ? (
          <div className={`transition-opacity duration-150 ${activeTab === 'fund' ? 'opacity-100' : 'opacity-0'}`}>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => handleDragEnd(e, 'fund')}
            >
              <SortableContext
                items={funds.map(p => p.id)}
                strategy={verticalListSortingStrategy}
              >
                {funds.length === 0 ? (
                  <EmptyState type="fund" />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {funds.map((position) => (
                      <FundCard
                        key={position.id}
                        position={position}
                        onAddPosition={handleAddPosition}
                        onDelete={requestDeletePosition}
                        onViewHistory={handleViewHistory}
                      />
                    ))}
                  </div>
                )}
              </SortableContext>
            </DndContext>
          </div>
        ) : (
          <div className={`transition-opacity duration-150 ${activeTab === 'stock' ? 'opacity-100' : 'opacity-0'}`}>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e) => handleDragEnd(e, 'stock')}
            >
              <SortableContext
                items={stocks.map(p => p.id)}
                strategy={verticalListSortingStrategy}
              >
                {stocks.length === 0 ? (
                  <EmptyState type="stock" />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {stocks.map((position) => (
                      <StockCard
                        key={position.id}
                        position={position}
                        onAddPosition={handleAddPosition}
                        onDelete={requestDeletePosition}
                        onViewHistory={handleViewHistory}
                      />
                    ))}
                  </div>
                )}
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="fixed bottom-4 right-4 bg-[#12121a] border border-[#2a2a3a] px-4 py-2 rounded-none flex items-center gap-2">
          <svg className="w-4 h-4 animate-spin text-[#00ffff]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm text-gray-400">更新中...</span>
        </div>
      )}

      {/* Modals */}
      <AddPositionModal
        isOpen={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setPendingResult(null);
        }}
        onSubmit={handleAddPositionConfirm}
        result={pendingResult}
        loading={addingPosition}
      />

      <TransactionModal
        isOpen={txModalOpen}
        onClose={() => {
          setTxModalOpen(false);
          setSelectedPosition(null);
        }}
        onSubmit={handleTransactionSubmit}
        position={{
          code: selectedPosition?.code || '',
          name: selectedPosition?.name || '',
          type: selectedPosition?.type || 'fund',
        }}
        currentPrice={selectedPosition?.nav || 0}
      />

      <TransactionHistoryModal
        isOpen={historyModalOpen}
        onClose={() => {
          setHistoryModalOpen(false);
          setHistoryPosition(null);
        }}
        position={historyPosition}
        allTransactions={transactions}
      />

      {/* 删除确认对话框 */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gradient-to-br from-[#1a1a25] to-[#12121a] border border-[#2a2a3a] rounded-none p-6 max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#ff3333]/10 rounded flex items-center justify-center">
                <svg className="w-5 h-5 text-[#ff3333]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[#e0e0e0]">确认删除</h3>
            </div>
            <p className="text-gray-400 mb-6">
              确定要删除 <span className="text-[#e0e0e0] font-medium">{pendingDelete?.name}</span> 吗？此操作不可恢复，将同时删除所有交易记录。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setPendingDelete(null);
                }}
                className="flex-1 px-4 py-2 bg-[#2a2a3a] text-[#e0e0e0] hover:bg-[#3a3a4a] transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmDeletePosition}
                className="flex-1 px-4 py-2 bg-[#ff3333]/20 text-[#ff3333] border border-[#ff3333] hover:bg-[#ff3333]/30 transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
