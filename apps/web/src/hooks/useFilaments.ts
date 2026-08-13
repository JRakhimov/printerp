import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { CreateFilamentDto, UpdateFilamentDto, FilamentMaterial } from '@printerp/shared';

export interface Filament {
  id: string;
  brand: string;
  name: string;
  material: FilamentMaterial;
  color: string | null;
  pricePerSpool: number;
  spoolWeightG: number;
  costPerGram: string | number;
  stockG: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export function useFilaments(search?: string, material?: string) {
  return useQuery<Filament[]>({
    queryKey: ['filaments', { search, material }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (material) params.append('material', material);

      const res = await apiClient.get<Filament[]>(`/filaments?${params.toString()}`);
      return res.data;
    },
  });
}

export function useCreateFilament() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateFilamentDto) => {
      const res = await apiClient.post<Filament>('/filaments', dto);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filaments'] });
    },
  });
}

export function useUpdateFilament() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateFilamentDto }) => {
      const res = await apiClient.patch<Filament>(`/filaments/${id}`, dto);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filaments'] });
    },
  });
}

export function useDeleteFilament() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/filaments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filaments'] });
    },
  });
}
