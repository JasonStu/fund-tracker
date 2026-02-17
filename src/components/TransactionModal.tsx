'use client';

import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/20/solid';
import { InvestmentType } from '@/types';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    type: 'buy' | 'sell';
    shares: number;
    price: number;
    notes?: string;
  }) => void;
  position: {
    code: string;
    name: string;
    type: InvestmentType;
  };
  currentPrice: number;
}

export default function TransactionModal({
  isOpen,
  onClose,
  onSubmit,
  position,
  currentPrice,
}: TransactionModalProps) {
  const [type, setType] = useState<'buy' | 'sell'>('buy');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sharesValue = shares === '' ? 0 : parseFloat(shares);
    const priceValue = price === '' ? 0 : parseFloat(price);
    onSubmit({
      type,
      shares: sharesValue,
      price: priceValue,
      notes: notes || undefined,
    });
    resetForm();
    onClose();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setShares('');
    setPrice('');
    setNotes('');
    setType('buy');
  };

  const isStock = position.type === 'stock';

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-lg bg-[#1a1a25] p-6 text-white border border-[#2a2a3a] shadow-2xl shadow-cyan-900/20">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <Dialog.Title className="text-lg font-bold flex items-center gap-2">
              <span className="text-[#00ffff]">交易操作</span>
            </Dialog.Title>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="关闭"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Position Info */}
          <div className="mb-6 p-3 rounded bg-[#0d0d15] border border-[#2a2a3a]">
            <div className="flex items-center gap-2">
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                isStock
                  ? 'bg-[#ff9500]/20 text-[#ff9500]'
                  : 'bg-[#00ffff]/20 text-[#00ffff]'
              }`}>
                {isStock ? '股票' : '基金'}
              </span>
            </div>
            <div className="text-[#e0e0e0] font-medium mt-2">{position.name}</div>
            <div className="text-xs text-gray-500 font-mono mt-1">{position.code}</div>
            {currentPrice > 0 && (
              <div className="text-xs text-gray-400 mt-2">
                当前{isStock ? '价格' : '净值'}: <span className="text-[#e0e0e0]">{currentPrice.toFixed(4)}</span>
              </div>
            )}
          </div>

          {/* Type Toggle */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">交易类型</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType('buy')}
                className={`flex-1 px-4 py-2.5 text-sm font-medium rounded transition-colors ${
                  type === 'buy'
                    ? 'bg-[#33ff33] text-[#1a1a25]'
                    : 'bg-[#0d0d15] border border-[#2a2a3a] text-gray-400 hover:text-white'
                }`}
              >
                买入
              </button>
              <button
                type="button"
                onClick={() => setType('sell')}
                className={`flex-1 px-4 py-2.5 text-sm font-medium rounded transition-colors ${
                  type === 'sell'
                    ? 'bg-[#ff3333] text-[#1a1a25]'
                    : 'bg-[#0d0d15] border border-[#2a2a3a] text-gray-400 hover:text-white'
                }`}
              >
                卖出
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="shares" className="block text-sm font-medium text-gray-300 mb-1.5">
                {isStock ? '股数' : '份额'}
              </label>
              <input
                type="number"
                id="shares"
                step="0.0001"
                min="0"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                placeholder="请输入数量"
                className="w-full px-3 py-2.5 rounded bg-[#0d0d15] border border-[#2a2a3a] text-[#e0e0e0] placeholder-gray-600 focus:outline-none focus:border-[#00ffff] focus:ring-1 focus:ring-[#00ffff] transition-colors"
                required
              />
            </div>

            <div>
              <label htmlFor="price" className="block text-sm font-medium text-gray-300 mb-1.5">
                {isStock ? '股价' : '单价'}
              </label>
              <input
                type="number"
                id="price"
                step="0.000001"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={currentPrice ? currentPrice.toString() : '请输入价格'}
                className="w-full px-3 py-2.5 rounded bg-[#0d0d15] border border-[#2a2a3a] text-[#e0e0e0] placeholder-gray-600 focus:outline-none focus:border-[#00ffff] focus:ring-1 focus:ring-[#00ffff] transition-colors"
                required
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-1.5">
                备注
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="可选"
                rows={2}
                className="w-full px-3 py-2.5 rounded bg-[#0d0d15] border border-[#2a2a3a] text-[#e0e0e0] placeholder-gray-600 focus:outline-none focus:border-[#00ffff] focus:ring-1 focus:ring-[#00ffff] transition-colors resize-none"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2.5 text-sm font-medium border border-[#2a2a3a] text-gray-400 hover:text-white hover:border-gray-500 rounded transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                className={`flex-1 px-4 py-2.5 text-sm font-medium rounded font-medium transition-colors ${
                  type === 'buy'
                    ? 'bg-[#33ff33] text-[#1a1a25] hover:bg-[#33ff33]/90'
                    : 'bg-[#ff3333] text-[#1a1a25] hover:bg-[#ff3333]/90'
                }`}
              >
                确认{type === 'buy' ? '买入' : '卖出'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
