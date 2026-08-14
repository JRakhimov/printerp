import { z } from 'zod';
import {
  PrinterManufacturer,
  PrinterIntegrationType,
  PrintJobStatus,
} from '../enums/index.js';

export const CreatePrinterSchema = z.object({
  name: z.string().min(1, 'Printer name is required'),
  model: z.string().min(1, 'Model is required'),
  serialNumber: z.string().optional().nullable(),
  ipAddress: z.string().optional().nullable(),
  accessCode: z.string().optional().nullable(),
  manufacturer: z.nativeEnum(PrinterManufacturer).default(PrinterManufacturer.BAMBU_LAB),
  integrationType: z.nativeEnum(PrinterIntegrationType).default(PrinterIntegrationType.BAMBUDDY),
  isActive: z.boolean().default(true),
});

export type CreatePrinterDto = z.infer<typeof CreatePrinterSchema>;

export const UpdatePrinterSchema = z.object({
  name: z.string().min(1).optional(),
  model: z.string().min(1).optional(),
  serialNumber: z.string().optional().nullable(),
  ipAddress: z.string().optional().nullable(),
  accessCode: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  lastStatus: z.string().optional().nullable(),
});

export type UpdatePrinterDto = z.infer<typeof UpdatePrinterSchema>;

export const TestConnectionSchema = z.object({
  ipAddress: z.string().min(1, 'IP Address is required'),
  accessCode: z.string().min(1, 'Access Code is required'),
  serialNumber: z.string().optional().nullable(),
});

export type TestConnectionDto = z.infer<typeof TestConnectionSchema>;

export const CreatePrintJobSchema = z.object({
  orderId: z.string().uuid(),
  printerId: z.string().uuid(),
  orderItemId: z.string().uuid().optional().nullable(),
  filename: z.string().optional().nullable(),
  quantity: z.number().int().positive().optional().nullable(),
  estimatedTimeMinutes: z.number().int().nonnegative().optional().nullable(),
  comment: z.string().optional().nullable(),
});

export type CreatePrintJobDto = z.infer<typeof CreatePrintJobSchema>;

export const UpdatePrintJobStatusSchema = z.object({
  status: z.nativeEnum(PrintJobStatus),
});

export type UpdatePrintJobStatusDto = z.infer<typeof UpdatePrintJobStatusSchema>;

export interface PrinterResponse {
  id: string;
  name: string;
  manufacturer: PrinterManufacturer;
  model: string;
  serialNumber: string | null;
  ipAddress: string | null;
  accessCode: string | null;
  integrationType: PrinterIntegrationType;
  isActive: boolean;
  lastStatus: string | null;
  lastSeenAt: string | null;
  nozzleTemp: number | null;
  bedTemp: number | null;
  printProgress: number | null;
  remainingMinutes: number | null;
  currentFile: string | null;
  createdAt: string;
  updatedAt: string;
  activeJob?: {
    id: string;
    orderId: string;
    orderNumber?: number;
    filename: string | null;
    status: PrintJobStatus;
    startedAt: string | null;
  } | null;
}
