import { z } from 'zod';
import { ScrapReason } from '../enums/index.js';

export const CreateScrapRecordSchema = z.object({
  filamentId: z.string().uuid('Invalid filament ID'),
  grams: z.number().int().positive('Grams must be greater than 0'),
  reason: z.nativeEnum(ScrapReason).default(ScrapReason.OTHER),
  comment: z.string().optional().nullable(),
  orderId: z.string().uuid().optional().nullable(),
  orderItemId: z.string().uuid().optional().nullable(),
  printerId: z.string().uuid().optional().nullable(),
  printJobId: z.string().uuid().optional().nullable(),
  reprint: z.boolean().optional(),
  reprintPrinterId: z.string().uuid().optional().nullable(),
});

export type CreateScrapRecordDto = z.input<typeof CreateScrapRecordSchema>;

export const ScrapQuerySchema = z.object({
  filamentId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  printerId: z.string().uuid().optional(),
  reason: z.nativeEnum(ScrapReason).optional(),
});

export type ScrapQueryDto = z.infer<typeof ScrapQuerySchema>;

export interface ScrapSummaryResponse {
  totalGrams: number;
  totalCost: number;
  incidentsCount: number;
  byReason: Record<string, { grams: number; cost: number; count: number }>;
}
