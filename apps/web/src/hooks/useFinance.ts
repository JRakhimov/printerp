import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import {
  CreateTransactionDto,
  TransactionQueryDto,
  FinancialSummary,
  MonthlyAnalytics,
  TopModelMetric,
  TopClientMetric,
  TransactionType,
  ExpenseCategory,
} from '@printerp/shared';

export interface TransactionItem {
  id: string;
  type: TransactionType;
  category: ExpenseCategory;
  amount: number;
  date: string;
  comment: string | null;
  orderId: string | null;
  order?: {
    id: string;
    orderNumber: number;
  };
  createdBy?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  };
  createdAt: string;
}

export function useFinancialSummary() {
  return useQuery<FinancialSummary>({
    queryKey: ['finance', 'summary'],
    queryFn: async () => {
      const res = await apiClient.get<FinancialSummary>('/finance/summary');
      return res.data;
    },
  });
}

export function useMonthlyAnalytics() {
  return useQuery<MonthlyAnalytics[]>({
    queryKey: ['finance', 'monthly'],
    queryFn: async () => {
      const res = await apiClient.get<MonthlyAnalytics[]>('/finance/monthly');
      return res.data;
    },
  });
}

export function useTopModels() {
  return useQuery<TopModelMetric[]>({
    queryKey: ['finance', 'top-models'],
    queryFn: async () => {
      const res = await apiClient.get<TopModelMetric[]>('/finance/top-models');
      return res.data;
    },
  });
}

export function useTopClients() {
  return useQuery<TopClientMetric[]>({
    queryKey: ['finance', 'top-clients'],
    queryFn: async () => {
      const res = await apiClient.get<TopClientMetric[]>('/finance/top-clients');
      return res.data;
    },
  });
}

export function useTransactions(query?: TransactionQueryDto) {
  return useQuery<TransactionItem[]>({
    queryKey: ['finance', 'transactions', query],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query?.type) params.append('type', query.type);
      if (query?.category) params.append('category', query.category);
      if (query?.search) params.append('search', query.search);

      const res = await apiClient.get<TransactionItem[]>(`/finance/transactions?${params.toString()}`);
      return res.data;
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateTransactionDto) => {
      const res = await apiClient.post<TransactionItem>('/finance/transactions', dto);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/finance/transactions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance'] });
    },
  });
}
