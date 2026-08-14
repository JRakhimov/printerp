import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import {
  CreatePrinterDto,
  UpdatePrinterDto,
  TestConnectionDto,
  CreatePrintJobDto,
  PrinterResponse,
  PrintJobStatus,
} from '@printerp/shared';

export interface TestConnectionResult {
  success: boolean;
  message: string;
  telemetry?: {
    gcodeState?: string;
    percent?: number;
    remainingMinutes?: number;
    nozzleTemp?: number;
    bedTemp?: number;
    currentFile?: string;
  };
}

export function usePrinters() {
  return useQuery<PrinterResponse[]>({
    queryKey: ['printers'],
    queryFn: async () => {
      const res = await apiClient.get<PrinterResponse[]>('/printers');
      return res.data;
    },
    refetchInterval: 5000, // Poll every 5 seconds for live telemetry
  });
}

export function usePrinter(id: string) {
  return useQuery<PrinterResponse>({
    queryKey: ['printers', id],
    queryFn: async () => {
      const res = await apiClient.get<PrinterResponse>(`/printers/${id}`);
      return res.data;
    },
    enabled: !!id,
    refetchInterval: 4000,
  });
}

export function useCreatePrinter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dto: CreatePrinterDto) => {
      const res = await apiClient.post<PrinterResponse>('/printers', dto);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printers'] });
    },
  });
}

export function useUpdatePrinter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, dto }: { id: string; dto: UpdatePrinterDto }) => {
      const res = await apiClient.patch<PrinterResponse>(`/printers/${id}`, dto);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printers'] });
    },
  });
}

export function useDeletePrinter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/printers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printers'] });
    },
  });
}

export function useTestPrinterConnection() {
  return useMutation({
    mutationFn: async (dto: TestConnectionDto) => {
      const res = await apiClient.post<TestConnectionResult>('/printers/test', dto);
      return res.data;
    },
  });
}

export function useCreatePrintJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ printerId, dto }: { printerId: string; dto: CreatePrintJobDto }) => {
      const res = await apiClient.post(`/printers/${printerId}/jobs`, dto);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printers'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useUpdatePrintJobStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, status }: { jobId: string; status: PrintJobStatus }) => {
      const res = await apiClient.patch(`/printers/jobs/${jobId}/status`, { status });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['printers'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
