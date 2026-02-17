'use client';

import { useMemo } from 'react';
import { Dialog } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/20/solid';
import { Transaction, InvestmentType } from '@/types';
import numeral from 'numeral';

interface TransactionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  position: { code: string; name: string; type: InvestmentType } | null;
  allTransactions: Transaction[];
}

interface DayTradeRecord {
  buyTx: Transaction;
  sellTx: Transaction;
  priceDiff: number;
  profit: number;
  isSameDay: boolean;
}

export default function TransactionHistoryModal({
  isOpen,
  onClose,
  position,
  allTransactions,
}: TransactionHistoryModalProps) {
  // Filter and group transactions for this position
  const { transactions, dayTrades, dailySummary } = useMemo(() => {
    if (!position) return { transactions: [], dayTrades: [], dailySummary: {} };

    // Filter transactions for this position
    const filtered = allTransactions.filter(
      (tx) => tx.code === position.code && tx.type === position.type
    );

    // Sort by date descending
    const sorted = [...filtered].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Detect day trades (same day buy and sell)
    const dayTrades: DayTradeRecord[] = [];
    const transactionsWithDayTrade = new Set<string>();

    // Group by date
    const byDate: Record<string, Transaction[]> = {};
    sorted.forEach((tx) => {
      const date = tx.created_at.split('T')[0];
      if (!byDate[date]) byDate[date] = [];
      byDate[date].push(tx);
    });

    // Check for day trades within each day
    Object.entries(byDate).forEach(([date, txs]) => {
      const buys = txs.filter((tx) => tx.transaction_type === 'buy');
      const sells = txs.filter((tx) => tx.transaction_type === 'sell');

      // Match buys with sells for day trades
      buys.forEach((buy) => {
        sells.forEach((sell) => {
          if (sell.shares <= buy.shares) {
            // This is a day trade
            dayTrades.push({
              buyTx: buy,
              sellTx: sell,
              priceDiff: sell.price - buy.price,
              profit: (sell.price - buy.price) * sell.shares,
              isSameDay: true,
            });
            transactionsWithDayTrade.add(buy.id);
            transactionsWithDayTrade.add(sell.id);
          }
        });
      });
    });

    // Daily summary
    const dailySummary: Record<string, { buy: number; sell: number; net: number }> = {};
    Object.entries(byDate).forEach(([date, txs]) => {
      let buy = 0;
      let sell = 0;
      txs.forEach((tx) => {
        const amount = tx.shares * tx.price;
        if (tx.transaction_type === 'buy') {
          buy += amount;
        } else {
          sell += amount;
        }
      });
      dailySummary[date] = { buy, sell, net: sell - buy };
    });

    return {
      transactions: sorted,
      dayTrades: dayTrades.sort(
        (a, b) => new Date(b.sellTx.created_at).getTime() - new Date(a.sellTx.created_at).getTime()
      ),
      dailySummary,
    };
  }, [position, allTransactions]);

  if (!position) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const isStock = position.type === 'stock';

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/80" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="w-full max-w-2xl max-h-[80vh] rounded-lg bg-[#1a1a25] p-6 text-white border border-[#2a2a3a] shadow-2xl shadow-cyan-900/20 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-center mb-4 shrink-0">
            <Dialog.Title className="text-lg font-bold flex items-center gap-2">
              <span className="text-[#ffff00]">交易记录</span>
              <span className="text-gray-400">|</span>
              <span className="text-[#e0e0e0]">{position.name}</span>
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="关闭"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Position Info */}
          <div className="flex items-center gap-3 mb-4 p-3 rounded bg-[#0d0d15] border border-[#2a2a3a] shrink-0">
            <span className={`text-xs px-1.5 py-0.5 rounded ${
              isStock
                ? 'bg-[#ff9500]/20 text-[#ff9500]'
                : 'bg-[#00ffff]/20 text-[#00ffff]'
            }`}>
              {isStock ? '股票' : '基金'}
            </span>
            <span className="text-sm text-gray-400">{position.code}</span>
          </div>

          {/* Content */}
          <div className="overflow-auto flex-1">
            {/* Day Trades Section */}
            {dayTrades.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-[#ff9500] mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  日内做T记录
                </h3>
                <div className="space-y-2">
                  {dayTrades.map((dt, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded bg-[#0d0d15] border border-[#ff9500]/30"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-500">{formatDate(dt.sellTx.created_at)}</span>
                        <span className="text-xs px-2 py-0.5 rounded bg-[#ff9500]/20 text-[#ff9500]">
                          T+0
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-500 text-xs">买入</div>
                          <div className="text-[#33ff33]">
                            {numeral(dt.buyTx.price).format('0.0000')} × {numeral(dt.buyTx.shares).format('0,0')}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs">卖出</div>
                          <div className="text-[#ff3333]">
                            {numeral(dt.sellTx.price).format('0.0000')} × {numeral(dt.sellTx.shares).format('0,0')}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs">差价</div>
                          <div className={`${dt.priceDiff >= 0 ? 'text-[#ff3333]' : 'text-[#33ff33]'}`}>
                            {dt.priceDiff >= 0 ? '+' : ''}{numeral(dt.priceDiff).format('0.0000')}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-xs">收益</div>
                          <div className={`font-semibold ${dt.profit >= 0 ? 'text-[#ff3333]' : 'text-[#33ff33]'}`}>
                            {dt.profit >= 0 ? '+' : ''}{numeral(dt.profit).format('0,0.00')}
                          </div>
                        </div>
                      </div>
                      {dt.buyTx.notes && (
                        <div className="text-xs text-gray-500 mt-2">{dt.buyTx.notes}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transaction History */}
            <div>
              <h3 className="text-sm font-semibold text-[#e0e0e0] mb-3">全部交易</h3>
              <div className="space-y-1">
                {transactions.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
暂无交易记录
                  </div>
                ) : (
                  transactions.map((tx) => {
                    const isBuy = tx.transaction_type === 'buy';
                    return (
                      <div
                        key={tx.id}
                        className={`p-3 rounded border-l-4 ${
                          isBuy
                            ? 'bg-[#0d0d15] border-[#33ff33]'
                            : 'bg-[#0d0d15] border-[#ff3333]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`text-xs px-2 py-0.5 rounded ${
                              isBuy
                                ? 'bg-[#33ff33]/20 text-[#33ff33]'
                                : 'bg-[#ff3333]/20 text-[#ff3333]'
                            }`}>
                              {isBuy ? '买入' : '卖出'}
                            </span>
                            <span className="text-xs text-gray-500">{formatDate(tx.created_at)}</span>
                          </div>
                          <span className="text-sm text-[#e0e0e0]">
                            {numeral(tx.price).format('0.0000')} × {numeral(tx.shares).format('0,0')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-gray-500">
                            成交额: {numeral(tx.price * tx.shares).format('0,0.00')}
                          </span>
                          {tx.notes && (
                            <span className="text-xs text-gray-400">{tx.notes}</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Daily Summary */}
            {Object.keys(dailySummary).length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-[#e0e0e0] mb-3">每日汇总</h3>
                <div className="space-y-1">
                  {Object.entries(dailySummary).map(([date, summary]) => (
                    <div key={date} className="flex items-center justify-between p-2 rounded bg-[#0d0d15] border border-[#2a2a3a]">
                      <span className="text-sm text-gray-400">{date}</span>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-[#33ff33]">买入 {numeral(summary.buy).format('0,0')}</span>
                        <span className="text-[#ff3333]">卖出 {numeral(summary.sell).format('0,0')}</span>
                        <span className={`${summary.net >= 0 ? 'text-[#ff3333]' : 'text-[#33ff33]'}`}>
                          净 {summary.net >= 0 ? '+' : ''}{numeral(summary.net).format('0,0')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}
