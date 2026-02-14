'use client';

import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/20/solid';

interface AddFundModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { shares: number; cost: number }) => void;
  fundName: string;
  fundCode: string;
}

export default function AddFundModal({
  isOpen,
  onClose,
  onSubmit,
  fundName,
  fundCode,
}: AddFundModalProps) {
  const [shares, setShares] = useState('');
  const [cost, setCost] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      shares: parseFloat(shares),
      cost: parseFloat(cost),
    });
    setShares('');
    setCost('');
  };

  const handleClose = () => {
    setShares('');
    setCost('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-md rounded-lg bg-[#1a1a25] p-6 text-white border border-[#2a2a3a] shadow-2xl shadow-cyan-900/20">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <Dialog.Title className="text-lg font-bold flex items-center gap-2">
              <span className="text-[#00ffff]">添加持仓</span>
            </Dialog.Title>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Fund Info */}
          <div className="mb-6 p-3 rounded bg-[#0d0d15] border border-[#2a2a3a]">
            <div className="text-sm text-gray-400">基金名称</div>
            <div className="text-[#e0e0e0] font-medium">{fundName}</div>
            <div className="text-xs text-gray-500 font-mono mt-1">{fundCode}</div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="shares" className="block text-sm font-medium text-gray-300 mb-1.5">
                份额
              </label>
              <input
                type="number"
                id="shares"
                step="0.0001"
                precision={4}
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                placeholder="请输入份额"
                className="w-full px-3 py-2.5 rounded bg-[#0d0d15] border border-[#2a2a3a] text-[#e0e0e0] placeholder-gray-600 focus:outline-none focus:border-[#00ffff] focus:ring-1 focus:ring-[#00ffff] transition-colors"
                required
              />
            </div>

            <div>
              <label htmlFor="cost" className="block text-sm font-medium text-gray-300 mb-1.5">
                成本
              </label>
              <input
                type="number"
                id="cost"
                step="0.000001"
                precision={6}
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="请输入成本"
                className="w-full px-3 py-2.5 rounded bg-[#0d0d15] border border-[#2a2a3a] text-[#e0e0e0] placeholder-gray-600 focus:outline-none focus:border-[#00ffff] focus:ring-1 focus:ring-[#00ffff] transition-colors"
                required
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
                className="flex-1 px-4 py-2.5 text-sm font-medium bg-[#00ffff] text-[#1a1a25] hover:bg-[#00ffff]/90 rounded font-medium transition-colors"
              >
                确认添加
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
