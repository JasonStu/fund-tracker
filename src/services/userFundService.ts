import { apiClient, ApiResponse } from '@/lib/api/client';
import { Position, Transaction } from '@/types';

export const userFundService = {
  async getPositions(): Promise<ApiResponse<{ positions: Position[]; transactions: Transaction[] }>> {
    return apiClient.get('/user-funds');
  },

  async addFund(params: { fund_code: string; fund_name: string; shares: number; cost: number }) {
    return apiClient.post('/user-funds', params);
  },

  async deleteFund(id: string) {
    return apiClient.delete(`/user-funds/positions/${id}`);
  },

  async updateSortOrder(items: Array<{ id: string; sort_order: number }>) {
    return apiClient.put('/user-funds/sort', items);
  },

  async addTransaction(params: { fund_id: string; type: 'buy' | 'sell'; shares: number; price: number; notes?: string }) {
    return apiClient.post('/user-funds/transactions', params);
  },
};
