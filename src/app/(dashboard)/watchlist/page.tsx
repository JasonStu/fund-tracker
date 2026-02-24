// src/app/(dashboard)/watchlist/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import { useTranslations } from 'next-intl';
import numeral from 'numeral';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import AddPositionModal from '@/components/AddPositionModal';
import { InvestmentType } from '@/types';
import { getStockPrice } from '@/utils/stockApi';

interface WatchlistItem {
  id: string;
  type: '情报扫描' | '金股' | '盘中重点';
  code: string;
  name: string;
  sector: string;
  price_range: string;
  strategy: string;
  first_profit_price: number;
  stop_loss_price: number;
  position_pct: string;
  highlights: string;
  created_at: string;
  registered_price: number;
  current_price?: number;
  price_diff?: number;
}

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  '情报扫描': { bg: 'bg-[#00BFFF]/10', text: 'text-[#00BFFF]', border: 'border-[#00BFFF]/30' },
  '金股': { bg: 'bg-[#FFD700]/10', text: 'text-[#FFD700]', border: 'border-[#FFD700]/30' },
  '盘中重点': { bg: 'bg-[#FF6B6B]/10', text: 'text-[#FF6B6B]', border: 'border-[#FF6B6B]/30' },
};

export default function WatchlistPage() {
  const t = useTranslations('Watchlist');
  const [list, setList] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<{ code: string; name: string } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchList = async () => {
    try {
      const res = await apiClient.get<{ list: WatchlistItem[] }>('/watchlist');
      setList(res.data?.list || []);
    } catch (e) {
      console.error('Failed to fetch watchlist', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, []);

  // 获取实时股价和计算价差
  useEffect(() => {
    if (list.length === 0) return;

    const fetchPrices = async () => {
      const updatedList = await Promise.all(
        list.map(async (item) => {
          try {
            const price = await getStockPrice(item.code);
            const priceDiff = item.registered_price
              ? ((price - item.registered_price) / item.registered_price) * 100
              : 0;
            return { ...item, current_price: price, price_diff: priceDiff };
          } catch {
            return { ...item, current_price: 0, price_diff: 0 };
          }
        })
      );
      setList(updatedList);
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 60000); // 每60秒刷新

    return () => clearInterval(interval);
  }, [list.length]);

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除吗？')) return;
    try {
      await apiClient.delete(`/watchlist/${id}`);
      fetchList();
    } catch (e) {
      console.error('Failed to delete', e);
    }
  };

  const handleAddToPortfolio = (item: WatchlistItem) => {
    setSelectedStock({ code: item.code, name: item.name });
    setAddModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#0d0d15]">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#0d0d15] via-[#12121a] to-[#0d0d15] border-b border-[#2a2a3a] p-6">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(to right, #FFD700 1px, transparent 1px),
              linear-gradient(to bottom, #FFD700 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }} />
        </div>
        <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-[#FFD700] opacity-50" />
        <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-[#ff00ff] opacity-50" />

        <div className="relative">
          <h1 className="text-2xl font-bold text-[#FFD700] flex items-center gap-3">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            {t('title')}
          </h1>
          <p className="text-gray-400 mt-1 text-sm">关注股票列表，实时追踪股价变化</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-[#1a1a25] border border-[#2a2a3a] rounded-full flex items-center justify-center mb-4">
              <svg className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
            <p className="text-gray-500">{t('empty')}</p>
            <p className="text-gray-600 text-sm mt-1">通过飞书编辑器添加股票</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((item) => (
              <div
                key={item.id}
                className="bg-gradient-to-br from-[#0d0d15] to-[#12121a] border border-[#2a2a3a] hover:border-[#FFD700]/30 transition-all duration-300 overflow-hidden"
              >
                {/* Main Row */}
                <div className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    {/* Left: Type + Stock */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`px-2.5 py-1 rounded text-xs font-medium border ${TYPE_COLORS[item.type]?.bg} ${TYPE_COLORS[item.type]?.text} ${TYPE_COLORS[item.type]?.border}`}>
                        {item.type}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[#e0e0e0] font-medium truncate">{item.name}</div>
                        <div className="text-xs text-gray-500">{item.code}</div>
                      </div>
                    </div>

                    {/* Center: Key Metrics */}
                    <div className="flex-1 flex items-center justify-around gap-4 text-center">
                      <div>
                        <div className="text-xs text-gray-500">登记价格</div>
                        <div className="text-gray-300 font-mono">{numeral(item.registered_price).format('0.00')}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">当前股价</div>
                        <div className="text-[#FFD700] font-mono font-medium">
                          {item.current_price ? numeral(item.current_price).format('0.00') : '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">价差</div>
                        <div className={`font-mono font-medium ${
                          (item.price_diff || 0) >= 0 ? 'text-[#ff3333]' : 'text-[#33ff33]'
                        }`}>
                          {item.price_diff ? (item.price_diff >= 0 ? '+' : '') + numeral(item.price_diff).format('0.00') + '%' : '-'}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleAddToPortfolio(item)}
                        className="px-3 py-1.5 text-xs bg-[#00ffff]/10 border border-[#00ffff]/30 text-[#00ffff] hover:bg-[#00ffff]/20 hover:border-[#00ffff]/50 rounded transition-colors"
                      >
                        关注
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="px-3 py-1.5 text-xs bg-[#ff3333]/10 border border-[#ff3333]/30 text-[#ff3333] hover:bg-[#ff3333]/20 hover:border-[#ff3333]/50 rounded transition-colors"
                      >
                        删除
                      </button>
                      <button
                        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                        className="px-3 py-1.5 text-xs text-gray-400 hover:text-[#FFD700] transition-colors"
                      >
                        {expandedId === item.id ? '收起' : '详情'}
                      </button>
                    </div>
                  </div>

                  {/* Secondary Info */}
                  <div className="mt-3 pt-3 border-t border-[#2a2a3a] flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    <div>
                      <span className="text-gray-500">板块：</span>
                      <span className="text-gray-400">{item.sector || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">策略：</span>
                      <span className="text-gray-400">{item.strategy || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">买入区间：</span>
                      <span className="text-gray-400">{item.price_range || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">止盈位：</span>
                      <span className="text-[#ff3333]">{item.first_profit_price || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">止损位：</span>
                      <span className="text-[#33ff33]">{item.stop_loss_price || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">仓位：</span>
                      <span className="text-gray-400">{item.position_pct || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Expanded: Highlights */}
                {expandedId === item.id && item.highlights && (
                  <div className="px-4 pb-4 pt-2 border-t border-[#2a2a3a] bg-[#0a0a10]">
                    <div className="text-xs text-gray-500 mb-1">投资亮点</div>
                    <p className="text-gray-400 text-sm leading-relaxed">{item.highlights}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AddPositionModal
        isOpen={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setSelectedStock(null);
        }}
        onSubmit={async ({ shares, cost }) => {
          if (!selectedStock) return;
          await apiClient.post('/user-funds', {
            type: 'stock',
            code: selectedStock.code,
            name: selectedStock.name,
            shares,
            cost,
          });
          setAddModalOpen(false);
          setSelectedStock(null);
        }}
        result={selectedStock ? { code: selectedStock.code, name: selectedStock.name, type: 'stock' as InvestmentType } : null}
        loading={false}
      />
    </div>
  );
}
