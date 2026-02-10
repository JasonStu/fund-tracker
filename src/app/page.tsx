'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { Combobox } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon, TrashIcon, PlusIcon } from '@heroicons/react/20/solid';
import { FundRealtimeValuation } from '@/types';
import numeral from 'numeral';

// Simple useLocalStorage hook logic inside component for simplicity
const STORAGE_KEY = 'my_funds';

export default function Home() {
  const [myFunds, setMyFunds] = useState<string[]>([]);
  const [fundData, setFundData] = useState<FundRealtimeValuation[]>([]);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setMyFunds(JSON.parse(saved));
    } else {
      // Default funds for demo
      const defaults = ['320007', '005827']; // Noah Growth, E Fund Blue Chip
      setMyFunds(defaults);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    }
  }, []);

  // Fetch data for my funds
  useEffect(() => {
    if (myFunds.length === 0) {
      setFundData([]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      const promises = myFunds.map(code => 
        axios.get(`/api/funds/realtime?code=${code}`).then(res => res.data).catch(() => null)
      );
      
      const results = await Promise.all(promises);
      setFundData(results.filter(r => r !== null));
      setLoading(false);
    };

    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [myFunds]);

  // Search logic
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
    }, 300); // Debounce

    return () => clearTimeout(timeoutId);
  }, [query]);

  const addFund = (fund: any) => {
    if (!myFunds.includes(fund.code)) {
      const newFunds = [...myFunds, fund.code];
      setMyFunds(newFunds);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newFunds));
    }
    setQuery('');
  };

  const removeFund = (code: string) => {
    const newFunds = myFunds.filter(c => c !== code);
    setMyFunds(newFunds);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newFunds));
  };

  return (
    <div className="space-y-8">
      {/* Search Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Add Fund</h2>
        <div className="relative">
          <Combobox onChange={addFund}>
            <div className="relative mt-1">
              <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-teal-300 sm:text-sm">
                <Combobox.Input
                  className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0"
                  displayValue={(fund: any) => fund?.name || ''}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by code or name..."
                />
                <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                  <ChevronUpDownIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </Combobox.Button>
              </div>
              <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm z-10">
                {searchResults.length === 0 && query !== '' ? (
                  <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                    Nothing found.
                  </div>
                ) : (
                  searchResults.map((fund) => (
                    <Combobox.Option
                      key={fund.code}
                      className={({ active }) =>
                        `relative cursor-default select-none py-2 pl-10 pr-4 ${
                          active ? 'bg-teal-600 text-white' : 'text-gray-900'
                        }`
                      }
                      value={fund}
                    >
                      {({ selected, active }) => (
                        <>
                          <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                            {fund.code} - {fund.name}
                          </span>
                          {selected ? (
                            <span
                              className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                active ? 'text-white' : 'text-teal-600'
                              }`}
                            >
                              <CheckIcon className="h-5 w-5" aria-hidden="true" />
                            </span>
                          ) : null}
                        </>
                      )}
                    </Combobox.Option>
                  ))
                )}
              </Combobox.Options>
            </div>
          </Combobox>
        </div>
      </div>

      {/* Fund List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">My Portfolio</h2>
        </div>
        
        {myFunds.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No funds added yet. Search above to add.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fund</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">NAV</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Est. NAV</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Est. Change</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {fundData.map((fund) => (
                  <tr key={fund.fundCode} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link href={`/fund/${fund.fundCode}`} className="block group">
                        <div className="text-sm font-medium text-gray-900 group-hover:text-teal-600">{fund.fundName}</div>
                        <div className="text-sm text-gray-500">{fund.fundCode}</div>
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                      {fund.nav}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-semibold ${
                      fund.estimatedChange >= 0 ? 'text-red-500' : 'text-green-500'
                    }`}>
                      {numeral(fund.estimatedNav).format('0.0000')}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-semibold ${
                      fund.estimatedChange >= 0 ? 'text-red-500' : 'text-green-500'
                    }`}>
                      {fund.estimatedChange >= 0 ? '+' : ''}{numeral(fund.estimatedChangePercent).format('0.00')}%
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => removeFund(fund.fundCode)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {loading && fundData.length === 0 && (
                   <tr><td colSpan={5} className="px-6 py-4 text-center">Loading data...</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
