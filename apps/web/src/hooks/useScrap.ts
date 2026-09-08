import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import {
  CreateScrapRecordDto,
  ScrapQueryDto,
  ScrapSummaryResponse,
  ScrapReason,
  ScrapReasonLabels,
} from '@printerp/shared';

export { ScrapReason, ScrapReasonLabels };

export interface ScrapRecord {
  id: string;
  filamentId: string;
  orderId: string | null;
  orderItemId: string | null;
  printerId: string | null;
  printJobId: string | null;
  grams: number;
  cost: number;
  reason: ScrapReason;
  comment: string | null;
  createdById: string | null;
  createdAt: string;
  filament?: {
    id: string;
    brand: string;
    name: string;
    material: string;
    color: string | null;
    costPerGram: number | string;
  };
  order?: {
    id: string;
    orderNumber: number;
  };
  orderItem?: {
    id: string;
    projectNameSnapshot: string;
  };
  printer?: {
    id: string;
    name: string;
    model: string;
  };
  createdBy?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
  };
}

export function useScrapRecords(query?: ScrapQueryDto) {
  return useQuery<ScrapRecord[]>({
    queryKey: ['scrap', query],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (query?.filamentId) params.append('filamentId', query.filamentId);
      if (query?.orderId) params.append('orderId', query.orderId);
      if (query?.printerId) params.append('printerId', query.printerId);
      if (query?.reason) params.append('reason', query.reason);

      const res = await apiClient.get<ScrapRecord[]>(`/scrap?${params.toString()}`);
      return res.data;
    },
  });
}

export function useScrapSummary() {
  return useQuery<ScrapSummaryResponse>({
    queryKey: ['scrap-summary'],
    queryFn: async () => {
      const res = await apiClient.get<ScrapSummaryResponse>('/scrap/summary');
      return res.data;
    },
  });
}

export function useCreateScrapRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateScrapRecordDto) => {
      const res = await apiClient.post<ScrapRecord>('/scrap', dto);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['scrap'] });
      queryClient.invalidateQueries({ queryKey: ['scrap-summary'] });
      queryClient.invalidateQueries({ queryKey: ['filaments'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['printers'] });
      if (data.orderId) {
        queryClient.invalidateQueries({ queryKey: ['orders'] });
        queryClient.invalidateQueries({ queryKey: ['order', data.orderId] });
      }
    },
  });
}

export function useDeleteScrapRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/scrap/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scrap'] });
      queryClient.invalidateQueries({ queryKey: ['scrap-summary'] });
      queryClient.invalidateQueries({ queryKey: ['filaments'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
