import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import { CreateOrderDto, UpdateOrderDto, ChangeOrderStatusDto, OrderStatus, PaymentStatus } from '@printerp/shared';
import { Client } from './useClients';
import { Project } from './useProjects';

export { OrderStatus, PaymentStatus };

export interface OrderItem {
  id: string;
  orderId: string;
  projectId: string | null;
  projectNameSnapshot: string;
  quantity: number;
  unitCost: number;
  unitPrice: number;
  totalCost: number;
  totalPrice: number;
  project?: Project;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  comment: string | null;
  createdAt: string;
}

export interface OrderEvent {
  id: string;
  orderId: string;
  userId: string | null;
  eventType: string;
  oldValue: any;
  newValue: any;
  metadata: any;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: number;
  clientId: string;
  status: OrderStatus;
  deadline: string | null;
  calculatedCost: number;
  calculatedPrice: number;
  finalPrice: number;
  comment: string | null;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
  client: Client;
  items: OrderItem[];
  payments: Payment[];
  events?: OrderEvent[];
}

export function useOrders(filters?: { status?: OrderStatus; search?: string }) {
  return useQuery<Order[]>({
    queryKey: ['orders', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.search) params.append('search', filters.search);

      const res = await apiClient.get<Order[]>(`/orders?${params.toString()}`);
      return res.data;
    },
  });
}

export function useOrder(id: string | null) {
  return useQuery<Order>({
    queryKey: ['orders', id],
    queryFn: async () => {
      const res = await apiClient.get<Order>(`/orders/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreateOrderDto) => {
      const res = await apiClient.post<Order>('/orders', dto);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: ChangeOrderStatusDto }) => {
      const res = await apiClient.patch<Order>(`/orders/${id}/status`, dto);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdateOrderDto }) => {
      const res = await apiClient.patch<Order>(`/orders/${id}`, dto);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/orders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
