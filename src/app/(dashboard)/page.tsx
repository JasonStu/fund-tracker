'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Combobox } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon } from '@heroicons/react/20/solid';
import { Position } from '@/types';
import { useTranslations } from 'next-intl';
import PositionCard from '@/components/PositionCard';
import TransactionModal from '@/components/TransactionModal';
import AddFundModal from '@/components/AddFundModal';

type SearchFund = { code: string; name: string; type?: string };

interface SelectedPosition {
  id: string;
  fund_code: string;
  fund_name: string;
  nav: number;
}

export default function Home() {
  const t = useTranslations('Home');
  const [positions, setPositions] = useState<Position[]>([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [pendingFund, setPendingFund] = useState<SearchFund | null>(null);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchFund[]>([]);
  const [loading, setLoading] = useState(false);
  const [txModalOpen, setTxModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<SelectedPosition | null>(null);

  // Fetch positions from API
  const fetchPositions = async () => {
    try {
      const res = await axios.get('/api/user-funds');
      setPositions(res.data.positions || []);
    } catch (e) {
      console.error('Failed to fetch positions', e);
    }
  };

  useEffect(() => {
    fetchPositions();
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
    try {
      await axios.post('/api/user-funds', {
        fund_code: String(pendingFund.code || ''),
        fund_name: String(pendingFund.name || ''),
        shares: Number(shares) || 0,
        cost: Number(cost) || 0
      });
      await fetchPositions();
    } catch (e: any) {
      console.error('Failed to add fund', e?.response?.data || e.message);
    }
    setAddModalOpen(false);
    setPendingFund(null);
  };

  const removeFund = async (id: string) => {
    try {
      await axios.delete(`/api/user-funds/${id}`);
      setPositions(prev => prev.filter(f => f.id !== id));
    } catch (e) {
      console.error('Failed to remove fund', e);
    }
  };

  const handleAddPosition = (fundCode: string, fundName: string) => {
    const position = positions.find(p => p.fund_code === fundCode);
    if (position) {
      setSelectedPosition({
        id: position.id,
        fund_code: fundCode,
        fund_name: fundName,
        nav: position.estimatedNav || position.nav || 0,
      });
      setTxModalOpen(true);
    }
  };

  const handleViewHistory = (fundCode: string) => {
    console.log('View history for:', fundCode);
  };

  const handleTransactionSubmit = async (data: {
    type: 'buy' | 'sell';
    shares: number;
    price: number;
    notes?: string;
  }) => {
    if (!selectedPosition) return;
    try {
      await axios.post('/api/user-funds/transactions', {
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

  return (
    <div className="space-y-6">
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

        {positions.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-[#1a1a25] border border-[#2a2a3a] rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <p className="text-gray-500">{t('noFunds')}</p>
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {positions.map((position) => (
              <PositionCard
                key={position.id}
                position={position}
                onAddPosition={handleAddPosition}
                onViewHistory={handleViewHistory}
              />
            ))}
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

      <TransactionModal
        isOpen={txModalOpen}
        onClose={() => {
          setTxModalOpen(false);
          setSelectedPosition(null);
        }}
        onSubmit={handleTransactionSubmit}
        fund={{
          fund_code: selectedPosition?.fund_code || '',
          fund_name: selectedPosition?.fund_name || '',
        }}
        currentNav={selectedPosition?.nav || 0}
      />
    </div>
  );
}
