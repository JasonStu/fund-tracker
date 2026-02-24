'use client';

import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/20/solid';
import { LoadingSpinner } from './ui/LoadingSpinner';
import { apiClient } from '@/lib/api/client';

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
}

interface EditWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: WatchlistItem | null;
}

export default function EditWatchlistModal({
  isOpen,
  onClose,
  onSuccess,
  item,
}: EditWatchlistModalProps) {
  const [type, setType] = useState<'情报扫描' | '金股' | '盘中重点'>('情报扫描');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [sector, setSector] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [strategy, setStrategy] = useState('');
  const [firstProfitPrice, setFirstProfitPrice] = useState('');
  const [stopLossPrice, setStopLossPrice] = useState('');
  const [positionPct, setPositionPct] = useState('');
  const [highlights, setHighlights] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setType(item.type);
      setCode(item.code);
      setName(item.name);
      setSector(item.sector || '');
      setPriceRange(item.price_range || '');
      setStrategy(item.strategy || '');
      setFirstProfitPrice(item.first_profit_price?.toString() || '');
      setStopLossPrice(item.stop_loss_price?.toString() || '');
      setPositionPct(item.position_pct || '');
      setHighlights(item.highlights || '');
    }
  }, [item]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    setLoading(true);
    try {
      // 调用 PUT API 更新数据
      const response = await fetch(`/api/watchlist/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          code,
          name,
          sector,
          price_range: priceRange,
          strategy,
          first_profit_price: firstProfitPrice ? parseFloat(firstProfitPrice) : null,
          stop_loss_price: stopLossPrice ? parseFloat(stopLossPrice) : null,
          position_pct: positionPct,
          highlights,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to update:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (!item) return null;

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-[#1a1a25] p-6 text-white border border-[#2a2a3a] shadow-2xl shadow-cyan-900/20">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <Dialog.Title className="text-lg font-bold flex items-center gap-2">
              <span className="text-[#FFD700]">编辑股票</span>
            </Dialog.Title>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="关闭"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">类型</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full bg-[#0d0d15] border border-[#2a2a3a] rounded px-3 py-2 text-gray-200 focus:border-[#FFD700] focus:outline-none"
              >
                <option value="情报扫描">情报扫描</option>
                <option value="金股">金股</option>
                <option value="盘中重点">盘中重点</option>
              </select>
            </div>

            {/* Code & Name */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">股票代码</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-[#0d0d15] border border-[#2a2a3a] rounded px-3 py-2 text-gray-200 focus:border-[#FFD700] focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">股票名称</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0d0d15] border border-[#2a2a3a] rounded px-3 py-2 text-gray-200 focus:border-[#FFD700] focus:outline-none"
                  required
                />
              </div>
            </div>

            {/* Sector */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">板块</label>
              <input
                type="text"
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full bg-[#0d0d15] border border-[#2a2a3a] rounded px-3 py-2 text-gray-200 focus:border-[#FFD700] focus:outline-none"
              />
            </div>

            {/* Strategy */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">操作策略</label>
              <input
                type="text"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                className="w-full bg-[#0d0d15] border border-[#2a2a3a] rounded px-3 py-2 text-gray-200 focus:border-[#FFD700] focus:outline-none"
              />
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">买入区间</label>
              <input
                type="text"
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                placeholder="如：14.9-15.1"
                className="w-full bg-[#0d0d15] border border-[#2a2a3a] rounded px-3 py-2 text-gray-200 focus:border-[#FFD700] focus:outline-none"
              />
            </div>

            {/* Profit & Stop Loss */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">第一止盈位</label>
                <input
                  type="number"
                  step="0.01"
                  value={firstProfitPrice}
                  onChange={(e) => setFirstProfitPrice(e.target.value)}
                  className="w-full bg-[#0d0d15] border border-[#2a2a3a] rounded px-3 py-2 text-gray-200 focus:border-[#FFD700] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">止损位</label>
                <input
                  type="number"
                  step="0.01"
                  value={stopLossPrice}
                  onChange={(e) => setStopLossPrice(e.target.value)}
                  className="w-full bg-[#0d0d15] border border-[#2a2a3a] rounded px-3 py-2 text-gray-200 focus:border-[#FFD700] focus:outline-none"
                />
              </div>
            </div>

            {/* Position */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">仓位</label>
              <input
                type="text"
                value={positionPct}
                onChange={(e) => setPositionPct(e.target.value)}
                placeholder="如：10%"
                className="w-full bg-[#0d0d15] border border-[#2a2a3a] rounded px-3 py-2 text-gray-200 focus:border-[#FFD700] focus:outline-none"
              />
            </div>

            {/* Highlights */}
            <div>
              <label className="block text-sm text-gray-400 mb-1">投资亮点</label>
              <textarea
                value={highlights}
                onChange={(e) => setHighlights(e.target.value)}
                rows={3}
                className="w-full bg-[#0d0d15] border border-[#2a2a3a] rounded px-3 py-2 text-gray-200 focus:border-[#FFD700] focus:outline-none resize-none"
              />
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 py-2.5 px-4 border border-[#2a2a3a] text-gray-400 hover:text-white hover:border-gray-500 rounded transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 px-4 bg-[#FFD700] text-black font-medium hover:bg-[#FFD700]/90 disabled:opacity-50 rounded transition-colors flex items-center justify-center gap-2"
              >
                {loading && <LoadingSpinner className="w-4 h-4" />}
                保存
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
