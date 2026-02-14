'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { Combobox } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon, TrashIcon, ChartBarIcon } from '@heroicons/react/20/solid';
import { FundRealtimeValuation, FundDetail, UserFundWithValue } from '@/types';
import numeral from 'numeral';
import { useTranslations } from 'next-intl';
import FundComparison from '@/components/FundComparison';
import { DndContext, closestCenter, DragEndEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { SortableItem } from '@/components/SortableItem';
import AddFundModal from '@/components/AddFundModal';

type SearchFund = { code: string; name: string; type?: string };

export default function Home() {
  const t = useTranslations('Home');
  const [userFunds, setUserFunds] = useState<UserFundWithValue[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [pendingFund, setPendingFund] = useState<SearchFund | null>(null);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchFund[]>([]);
  const [loading, setLoading] = useState(false);

  // Comparison state
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonFunds, setComparisonFunds] = useState<FundDetail[]>([]);
  const [isComparingLoading, setIsComparingLoading] = useState(false);

  useEffect(() => {
    const fetchUserFunds = async () => {
      try {
        const res = await axios.get('/api/user-funds');
        setUserFunds(res.data || []);
      } catch (e) {
        console.error('Failed to fetch user funds', e);
      }
    };
    fetchUserFunds();
  }, []);

  useEffect(() => {
    if (userFunds.length === 0) {
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const promises = userFunds.map(fund =>
        axios.get(`/api/funds/realtime?code=${fund.fund_code}`).then(res => res.data).catch(() => null)
      );

      const results = await Promise.all(promises);
      const realtimeData = results.filter(r => r !== null) as FundRealtimeValuation[];

      // Merge realtime data with user fund data
      const mergedData = userFunds.map(userFund => {
        const realtime = realtimeData.find(r => r.fundCode === userFund.fund_code);
        if (!realtime) return null;

        const nav = realtime.nav || 0;
        const estimatedNav = realtime.estimatedNav || 0;
        const currentValue = userFund.shares * estimatedNav;
        const totalCost = userFund.shares * userFund.cost;
        const profit = currentValue - totalCost;
        const profitPercent = totalCost > 0 ? (profit / totalCost) * 100 : 0;

        return {
          ...userFund,
          nav,
          estimatedNav,
          estimatedChange: realtime.estimatedChange,
          estimatedChangePercent: realtime.estimatedChangePercent,
          currentValue,
          totalCost,
          profit,
          profitPercent,
        };
      }).filter(Boolean) as UserFundWithValue[];

      setUserFunds(mergedData);
      setLoading(false);
    };

    fetchData();
    const intervalId = setInterval(fetchData, 30000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        const res = await axios.get(`/api/funds/search?q=${query}`);
        setSearchResults(res.data.funds || []);
      } catch (e) {
        console.error(e);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const addFund = (fund: SearchFund | null) => {
    if (fund) {
      setPendingFund(fund);
      setAddModalOpen(true);
    }
    setQuery('');
    setSearchResults([]);
  };

  const handleAddFundConfirm = async ({ shares, cost }: { shares: number; cost: number }) => {
    if (!pendingFund) return;
    console.log('Adding fund:', { code: pendingFund.code, name: pendingFund.name, shares, cost });
    try {
      await axios.post('/api/user-funds', {
        fund_code: String(pendingFund.code || ''),
        fund_name: String(pendingFund.name || ''),
        shares: Number(shares) || 0,
        cost: Number(cost) || 0
      });
      const res = await axios.get('/api/user-funds');
      setUserFunds(res.data || []);
    } catch (e: any) {
      console.error('Failed to add fund', e?.response?.data || e.message);
    }
    setAddModalOpen(false);
    setPendingFund(null);
  };

  const removeFund = async (id: string) => {
    try {
      await axios.delete(`/api/user-funds/${id}`);
      setUserFunds(prev => prev.filter(f => f.id !== id));
    } catch (e) {
      console.error('Failed to remove fund', e);
    }
  };

  const handleCompare = async () => {
    if (userFunds.length === 0) return;

    setIsComparingLoading(true);
    try {
      const promises = userFunds.map(fund =>
        axios.get(`/api/funds/${fund.fund_code}/holdings`).then(res => res.data)
      );
      const results = await Promise.all(promises);
      setComparisonFunds(results);
      setIsComparing(true);
    } catch (e) {
      console.error('Failed to fetch comparison data', e);
    } finally {
      setIsComparingLoading(false);
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setUserFunds((items) => {
        const oldIndex = items.findIndex((item) => item.fund_code === active.id);
        const newIndex = items.findIndex((item) => item.fund_code === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <div className="space-y-6">
      <FundComparison
        isOpen={isComparing}
        onClose={() => setIsComparing(false)}
        funds={comparisonFunds}
      />
      {/* Search Section */}
      <div className="panel-metal rounded-none p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-[#1a1a25] border border-[#00ffff] rounded flex items-center justify-center shadow-[0_0_10px_rgba(0,255,255,0.3)]">
            <svg className="w-4 h-4 text-[#00ffff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[#e0e0e0]">{t('addFund')}</h2>
        </div>
        <div className="relative">
          <Combobox onChange={addFund}>
            <div className="relative">
              <div className="relative w-full cursor-pointer overflow-hidden bg-[#0d0d15] border border-[#2a2a3a] hover:border-[#00ffff] transition-colors">
                <Combobox.Input
                  className="w-full border-none py-3 pl-4 pr-20 text-sm text-[#e0e0e0] placeholder-gray-500 bg-transparent focus:ring-0"
                  displayValue={(fund: SearchFund) => fund?.name || ''
                  }
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('searchPlaceholder')}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      setSearchResults([]);
                    }}
                    className="absolute inset-y-0 right-10 flex items-center pr-1 text-gray-500 hover:text-[#e0e0e0] transition-colors"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
                <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <ChevronUpDownIcon className="h-5 w-5 text-gray-500" />
                </Combobox.Button>
              </div>
              <Combobox.Options className="absolute mt-2 max-h-60 w-full overflow-auto bg-[#12121a] border border-[#2a2a3a] shadow-xl py-1 z-20">
                {searchResults.length === 0 && query !== '' ? (
                  <div className="relative cursor-default select-none py-3 px-4 text-gray-500 text-center text-sm">
                    {t('nothingFound')}
                  </div>
                ) : (
                  searchResults.map((fund) => (
                    <Combobox.Option
                      key={fund.code}
                      className={({ active }) =>
                        `relative cursor-pointer select-none py-3 pl-4 pr-4 transition-colors ${
                          active ? 'bg-[#1a1a25]' : ''
                        }`
                      }
                      value={fund}
                    >
                      {({ selected }) => (
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-[#e0e0e0]">{fund.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{fund.code}</div>
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
            </div>
          </Combobox>
        </div>
      </div>

      {/* Portfolio Section */}
      <div className="panel-metal rounded-none overflow-hidden">
        <div className="px-6 py-4 border-b border-[#2a2a3a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1a1a25] border border-[#ff00ff] rounded flex items-center justify-center shadow-[0_0_10px_rgba(255,0,255,0.3)]">
              <svg className="w-4 h-4 text-[#ff00ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-[#e0e0e0]">{t('myPortfolio')}</h2>
          </div>

          <div className="flex items-center gap-4">
            {userFunds.length > 0 && (
              <>
                <button
                  onClick={handleCompare}
                  disabled={isComparingLoading}
                  className="flex items-center gap-2 px-3 py-1.5 rounded bg-[#1a1a25] border border-[#00ffff] text-[#00ffff] hover:bg-[#00ffff] hover:text-[#1a1a25] transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isComparingLoading ? (
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <ChartBarIcon className="w-4 h-4" />
                  )}
                  {t('compare')}
                </button>
              </>
            )}

            {loading && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <svg className="w-4 h-4 animate-spin text-[#ff00ff]" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Loading...
              </div>
            )}
          </div>
        </div>

        {userFunds.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-[#1a1a25] border border-[#2a2a3a] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-gray-500">{t('noFunds')}</p>
          </div>
        ) : (
          <div className="divide-y divide-[#2a2a3a]">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={userFunds.map(f => f.fund_code)}
                strategy={verticalListSortingStrategy}
              >
                {userFunds.map((fund) => (
                  <SortableItem key={fund.fund_code} id={fund.fund_code}>
                    <Link
                      href={`/fund/${fund.fund_code}`}
                      className="flex items-center justify-between px-6 py-4 hover:bg-[#1a1a25] transition-colors group flex-1"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded flex items-center justify-center border ${
                          fund.estimatedChange >= 0
                            ? 'bg-[#1a1a25] border-[#ff3333]'
                            : 'bg-[#1a1a25] border-[#33ff33]'
                        }`}>
                          <svg className={`w-5 h-5 ${
                            fund.estimatedChange >= 0 ? 'text-[#ff3333]' : 'text-[#33ff33]'
                          }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {fund.estimatedChange >= 0 ? (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                            )}
                          </svg>
                        </div>
                        <div>
                          <div className="font-medium text-[#e0e0e0] group-hover:text-[#00ffff] transition-colors">{fund.fund_name}</div>
                          <div className="text-sm text-gray-500">{fund.fund_code}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        {/* Shares */}
                        <div className="text-right w-20">
                          <div className="text-xs text-gray-500">持有份额</div>
                          <div className="text-sm text-[#e0e0e0]">{numeral(fund.shares).format('0,0.0000')}</div>
                        </div>
                        {/* Cost */}
                        <div className="text-right w-20">
                          <div className="text-xs text-gray-500">成本价</div>
                          <div className="text-sm text-[#e0e0e0]">{numeral(fund.cost).format('0.000000')}</div>
                        </div>
                        {/* Current Value */}
                        <div className="text-right w-24">
                          <div className="text-xs text-gray-500">当前市值</div>
                          <div className="text-sm text-[#e0e0e0]">{numeral(fund.currentValue).format('0,0.00')}</div>
                        </div>
                        {/* Profit */}
                        <div className="text-right w-20">
                          <div className="text-xs text-gray-500">累计收益</div>
                          <div className={`text-sm font-semibold ${
                            fund.profit >= 0 ? 'text-[#ff3333]' : 'text-[#33ff33]'
                          }`}>
                            {fund.profit >= 0 ? '+' : ''}{numeral(fund.profit).format('0,0.00')}
                          </div>
                        </div>
                        {/* Profit Percent */}
                        <div className="text-right w-16">
                          <div className="text-xs text-gray-500">收益率</div>
                          <div className={`text-sm font-semibold ${
                            fund.profitPercent >= 0 ? 'text-[#ff3333]' : 'text-[#33ff33]'
                          }`}>
                            {fund.profitPercent >= 0 ? '+' : ''}{numeral(fund.profitPercent).format('0.00')}%
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            removeFund(fund.id);
                          }}
                          className="p-2 text-gray-500 hover:text-[#ff3333] hover:bg-[#1a1a25] transition-colors"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </Link>
                  </SortableItem>
                ))}
              </SortableContext>
            </DndContext>
          </div>
        )}
      </div>

      <AddFundModal
        isOpen={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setPendingFund(null);
        }}
        onSubmit={handleAddFundConfirm}
        fundName={pendingFund?.name || ''}
        fundCode={pendingFund?.code || ''}
      />
    </div>
  );
}
