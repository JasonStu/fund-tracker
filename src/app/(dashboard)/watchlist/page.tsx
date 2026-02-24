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

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  '情报扫描': { bg: 'bg-[#00BFFF]/20', text: 'text-[#00BFFF]' },
  '金股': { bg: 'bg-[#FFD700]/20', text: 'text-[#FFD700]' },
  '盘中重点': { bg: 'bg-[#FF6B6B]/20', text: 'text-[#FF6B6B]' },
};

export default function WatchlistPage() {
  const t = useTranslations('Watchlist');
  const [list, setList] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<{ code: string; name: string } | null>(null);

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
    <div className="p-4">
      <h1 className="text-2xl font-bold text-[#e0e0e0] mb-6">自选股关注列表</h1>

      {loading ? (
        <LoadingSpinner />
      ) : list.length === 0 ? (
        <div className="text-center text-gray-500 py-12">暂无数据</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2a2a3a]">
                <th className="text-left py-3 px-2 text-gray-400">类型</th>
                <th className="text-left py-3 px-2 text-gray-400">股票</th>
                <th className="text-left py-3 px-2 text-gray-400">提示日期</th>
                <th className="text-left py-3 px-2 text-gray-400">登记价格</th>
                <th className="text-left py-3 px-2 text-gray-400">价差</th>
                <th className="text-left py-3 px-2 text-gray-400">板块</th>
                <th className="text-left py-3 px-2 text-gray-400">操作策略</th>
                <th className="text-left py-3 px-2 text-gray-400">当前股价</th>
                <th className="text-left py-3 px-2 text-gray-400">买入区间</th>
                <th className="text-left py-3 px-2 text-gray-400">第一止盈位</th>
                <th className="text-left py-3 px-2 text-gray-400">止损位</th>
                <th className="text-left py-3 px-2 text-gray-400">仓位</th>
                <th className="text-left py-3 px-2 text-gray-400">投资亮点</th>
                <th className="text-left py-3 px-2 text-gray-400">操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item) => (
                <tr key={item.id} className="border-b border-[#2a2a3a] hover:bg-[#1a1a25]">
                  <td className="py-3 px-2">
                    <span className={`px-2 py-1 rounded text-xs ${TYPE_COLORS[item.type]?.bg} ${TYPE_COLORS[item.type]?.text}`}>
                      {item.type}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-[#e0e0e0]">{item.name}({item.code})</td>
                  <td className="py-3 px-2 text-gray-400">{new Date(item.created_at).toLocaleDateString()}</td>
                  <td className="py-3 px-2 text-gray-300">{numeral(item.registered_price).format('0.00')}</td>
                  <td className={`py-3 px-2 font-medium ${
                    (item.price_diff || 0) >= 0 ? 'text-[#ff3333]' : 'text-[#33ff33]'
                  }`}>
                    {item.price_diff ? (item.price_diff >= 0 ? '+' : '') + numeral(item.price_diff).format('0.00') + '%' : '-'}
                  </td>
                  <td className="py-3 px-2 text-gray-400 max-w-[150px] truncate">{item.sector}</td>
                  <td className="py-3 px-2 text-gray-400">{item.strategy}</td>
                  <td className="py-3 px-2 text-gray-300">
                    {item.current_price ? numeral(item.current_price).format('0.00') : '-'}
                  </td>
                  <td className="py-3 px-2 text-gray-400">{item.price_range}</td>
                  <td className="py-3 px-2 text-gray-300">{item.first_profit_price || '-'}</td>
                  <td className="py-3 px-2 text-gray-300">{item.stop_loss_price || '-'}</td>
                  <td className="py-3 px-2 text-gray-400">{item.position_pct}</td>
                  <td className="py-3 px-2 text-gray-400 max-w-[200px] truncate" title={item.highlights}>
                    {item.highlights}
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleAddToPortfolio(item)}
                        className="px-2 py-1 text-xs bg-[#00ffff]/20 text-[#00ffff] hover:bg-[#00ffff]/30 rounded"
                      >
                        关注
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="px-2 py-1 text-xs bg-[#ff3333]/20 text-[#ff3333] hover:bg-[#ff3333]/30 rounded"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
