import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import {
  UpdateFinancialSettingsDto,
  FinancialSettingsResponse,
} from '@printerp/shared';

export function useFinancialSettings() {
  return useQuery<FinancialSettingsResponse>({
    queryKey: ['settings', 'financial'],
    queryFn: async () => {
      const res = await apiClient.get<FinancialSettingsResponse>('/settings/financial');
      return res.data;
    },
  });
}

export function useUpdateFinancialSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: UpdateFinancialSettingsDto) => {
      const res = await apiClient.patch<FinancialSettingsResponse>('/settings/financial', dto);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}
