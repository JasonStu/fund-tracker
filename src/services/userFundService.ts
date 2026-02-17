import { apiClient } from '@/lib/api/client';
import { ApiResponse } from '@/lib/api/types';
import { Position, Transaction } from '@/types';

export const userFundService = {
  async getPositions(): Promise<ApiResponse<{ positions: Position[]; transactions: Transaction[] }>> {
    return apiClient.get('/user-funds');
  },

  async addPosition(params: { type: 'fund' | 'stock'; code: string; name: string; shares: number; cost: number }) {
    return apiClient.post('/user-funds', params);
  },

  async deletePosition(id: string) {
    return apiClient.delete(`/user-funds/positions/${id}`);
  },

  async updateSortOrder(items: Array<{ id: string; sort_order: number }>) {
    return apiClient.put('/user-funds/sort', items);
  },

  async addTransaction(params: { fund_id: string; type: 'buy' | 'sell'; shares: number; price: number; notes?: string }) {
    return apiClient.post('/user-funds/transactions', params);
  },
};
