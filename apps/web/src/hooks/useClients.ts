import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { CreateClientDto, UpdateClientDto, ClientSource } from '@printerp/shared';

export interface ClientOrderItem {
  id: string;
  projectNameSnapshot: string;
  quantity: number;
  totalPrice: number;
}

export interface ClientPayment {
  id: string;
  amount: number;
  createdAt: string;
}

export interface ClientOrderHistory {
  id: string;
  orderNumber: number;
  status: string;
  calculatedPrice: number;
  finalPrice: number | null;
  paymentStatus: string;
  deadline: string | null;
  createdAt: string;
  items: ClientOrderItem[];
  payments: ClientPayment[];
}

export interface Client {
  id: string;
  name: string;
  telegramUsername: string | null;
  instagramUsername: string | null;
  phone: string | null;
  source: ClientSource;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    orders: number;
  };
  orders?: ClientOrderHistory[];
}

export function useClients(search?: string, source?: string) {
  return useQuery<Client[]>({
    queryKey: ['clients', { search, source }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (source) params.append('source', source);

      const res = await apiClient.get<Client[]>(`/clients?${params.toString()}`);
      return res.data;
    },
  });
}

export function useClient(id: string | null) {
  return useQuery<Client>({
    queryKey: ['clients', id],
    queryFn: async () => {
      const res = await apiClient.get<Client>(`/clients/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateClientDto) => {
      const res = await apiClient.post<Client>('/clients', dto);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateClientDto }) => {
      const res = await apiClient.patch<Client>(`/clients/${id}`, dto);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/clients/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}
