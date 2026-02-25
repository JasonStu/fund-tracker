// src/app/(dashboard)/watchlist/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api/client';
import { useTranslations } from 'next-intl';
import numeral from 'numeral';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import AddPositionModal from '@/components/AddPositionModal';
import EditWatchlistModal from '@/components/EditWatchlistModal';
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
  isStale?: boolean;
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
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<WatchlistItem | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [priceCache, setPriceCache] = useState<Map<string, { price: number; timestamp: number }>>(new Map());
  const [refreshingStocks, setRefreshingStocks] = useState<Set<string>>(new Set());

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

  // 获取实时股价和计算价差（带缓存逻辑）
  useEffect(() => {
    if (list.length === 0) return;

    const fetchPrices = async (stockCode?: string) => {
      const stocksToFetch = stockCode
        ? [list.find(item => item.code === stockCode)].filter(Boolean)
        : list;

      // 使用 Promise.allSettled 确保即使某个股票获取失败也不影响其他股票
      const results = await Promise.allSettled(
        stocksToFetch.map(async (item) => {
          try {
            const price = await getStockPrice(item!.code);
            // 只有获取到有效价格时才更新
            if (price !== null && item!.registered_price) {
              const priceDiff = ((price - item!.registered_price) / item!.registered_price) * 100;
              // 更新缓存
              setPriceCache(prev => new Map(prev).set(item!.code, { price, timestamp: Date.now() }));
              return { ...item!, current_price: price, price_diff: priceDiff, isStale: false };
            }
            // 如果价格获取失败，检查缓存
            const cached = priceCache.get(item!.code);
            if (cached && item!.registered_price) {
              const priceDiff = ((cached.price - item!.registered_price) / item!.registered_price) * 100;
              return { ...item!, current_price: cached.price, price_diff: priceDiff, isStale: true };
            }
            // 无缓存，保持原值
            return { ...item!, isStale: true };
          } catch (error) {
            console.error(`Fetch price failed for ${item!.code}:`, error);
            // 检查缓存
            const cached = priceCache.get(item!.code);
            if (cached && item!.registered_price) {
              const priceDiff = ((cached.price - item!.registered_price) / item!.registered_price) * 100;
              return { ...item!, current_price: cached.price, price_diff: priceDiff, isStale: true };
            }
            return { ...item!, isStale: true };
          }
        })
      );

      // 提取成功的结果
      const updatedList = results
        .filter((result): result is PromiseFulfilledResult<WatchlistItem> => result.status === 'fulfilled')
        .map(result => result.value);

      if (stockCode) {
        // 单个刷新，更新对应项
        setList(prev => prev.map(item => {
          const updated = updatedList.find(u => u.code === item.code);
          return updated || item;
        }));
        setRefreshingStocks(prev => {
          const next = new Set(prev);
          next.delete(stockCode);
          return next;
        });
      } else {
        setList(updatedList);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 60000); // 每60秒刷新

    return () => clearInterval(interval);
  }, [list.length, priceCache]);

  const handleDelete = (id: string, name: string) => {
    setPendingDelete({ id, name });
    setDeleteConfirmOpen(true);
  };

  const confirmDeletePosition = async () => {
    if (!pendingDelete) return;
    try {
      await apiClient.delete(`/watchlist/${pendingDelete.id}`);
      fetchList();
    } catch (e) {
      console.error('Failed to delete', e);
    } finally {
      setDeleteConfirmOpen(false);
      setPendingDelete(null);
    }
  };

  const handleAddToPortfolio = (item: WatchlistItem) => {
    setSelectedStock({ code: item.code, name: item.name });
    setAddModalOpen(true);
  };

  const handleEdit = (item: WatchlistItem) => {
    setEditingItem(item);
    setEditModalOpen(true);
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
                {/* Main Row - Responsive */}
                <div className="p-4">
                  {/* 桌面端：水平布局 */}
                  <div className="hidden md:flex items-center justify-between gap-4">
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
                        <div className="flex items-center justify-center gap-1">
                          <div className="text-[#FFD700] font-mono font-medium">
                            {item.current_price ? numeral(item.current_price).format('0.00') : '-'}
                          </div>
                          {item.isStale && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRefreshingStocks(prev => new Set(prev).add(item.code));
                                fetchPrices(item.code);
                              }}
                              disabled={refreshingStocks.has(item.code)}
                              className="p-1 text-gray-500 hover:text-[#FFD700] transition-colors"
                              title="刷新价格"
                            >
                              <svg className={`w-3 h-3 ${refreshingStocks.has(item.code) ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </button>
                          )}
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
                        onClick={() => handleEdit(item)}
                        className="px-3 py-1.5 text-xs bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] hover:bg-[#FFD700]/20 hover:border-[#FFD700]/50 rounded transition-colors"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleAddToPortfolio(item)}
                        className="px-3 py-1.5 text-xs bg-[#00ffff]/10 border border-[#00ffff]/30 text-[#00ffff] hover:bg-[#00ffff]/20 hover:border-[#00ffff]/50 rounded transition-colors"
                      >
                        关注
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.name)}
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

                  {/* 移动端：垂直布局 */}
                  <div className="md:hidden flex flex-col gap-3">
                    {/* 第一行：股票信息 + 价格 */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium border ${TYPE_COLORS[item.type]?.bg} ${TYPE_COLORS[item.type]?.text} ${TYPE_COLORS[item.type]?.border}`}>
                          {item.type}
                        </span>
                        <div className="min-w-0">
                          <div className="text-[#e0e0e0] font-medium text-sm truncate">{item.name}</div>
                          <div className="text-xs text-gray-500">{item.code}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-[#FFD700] font-mono font-medium text-sm">
                            {item.current_price ? numeral(item.current_price).format('0.00') : '-'}
                          </span>
                          {item.isStale && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRefreshingStocks(prev => new Set(prev).add(item.code));
                                fetchPrices(item.code);
                              }}
                              disabled={refreshingStocks.has(item.code)}
                              className="p-1 text-gray-500 hover:text-[#FFD700] transition-colors"
                            >
                              <svg className={`w-3 h-3 ${refreshingStocks.has(item.code) ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </button>
                          )}
                        </div>
                        <div className={`text-xs font-mono ${
                          (item.price_diff || 0) >= 0 ? 'text-[#ff3333]' : 'text-[#33ff33]'
                        }`}>
                          {item.price_diff ? (item.price_diff >= 0 ? '+' : '') + numeral(item.price_diff).format('0.00') + '%' : '-'}
                        </div>
                      </div>
                    </div>

                    {/* 第二行：指标网格 */}
                    <div className="grid grid-cols-3 gap-2 text-center bg-[#1a1a25] rounded p-2">
                      <div>
                        <div className="text-xs text-gray-500">登记价</div>
                        <div className="text-gray-300 font-mono text-sm">{numeral(item.registered_price).format('0.00')}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">当前价</div>
                        <div className="text-[#FFD700] font-mono text-sm">{item.current_price ? numeral(item.current_price).format('0.00') : '-'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500">价差</div>
                        <div className={`font-mono text-sm ${(item.price_diff || 0) >= 0 ? 'text-[#ff3333]' : 'text-[#33ff33]'}`}>
                          {item.price_diff ? (item.price_diff >= 0 ? '+' : '') + numeral(item.price_diff).format('0.00') + '%' : '-'}
                        </div>
                      </div>
                    </div>

                    {/* 第三行：操作按钮 */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="flex-1 px-2 py-1.5 text-xs bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] rounded transition-colors"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => handleAddToPortfolio(item)}
                        className="flex-1 px-2 py-1.5 text-xs bg-[#00ffff]/10 border border-[#00ffff]/30 text-[#00ffff] rounded transition-colors"
                      >
                        关注
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.name)}
                        className="flex-1 px-2 py-1.5 text-xs bg-[#ff3333]/10 border border-[#ff3333]/30 text-[#ff3333] rounded transition-colors"
                      >
                        删除
                      </button>
                    </div>
                  </div>

                  {/* Secondary Info - Responsive */}
                  <div className="mt-3 pt-3 border-t border-[#2a2a3a]">
                    {/* 桌面端 */}
                    <div className="hidden md:flex flex-wrap gap-x-6 gap-y-2 text-sm">
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

                    {/* 移动端：两列布局 */}
                    <div className="md:hidden grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
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

      <EditWatchlistModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setEditingItem(null);
        }}
        onSuccess={() => fetchList()}
        item={editingItem}
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
              确定要删除 <span className="text-[#e0e0e0] font-medium">{pendingDelete?.name}</span> 吗？此操作不可恢复。
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
                className="flex-1 px-4 py-2 bg-[#ff3333]/20 text-[#ff3333] border border-[#ff3333] hover:bg-[#ff3333]/30 transition-colors flex items-center justify-center"
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
