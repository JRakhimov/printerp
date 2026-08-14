import { z } from 'zod';
import { TransactionType, ExpenseCategory } from '../enums/index.js';

export const CreateTransactionSchema = z.object({
  type: z.nativeEnum(TransactionType),
  category: z.nativeEnum(ExpenseCategory),
  amount: z.number().int().positive({ message: 'Amount must be greater than 0' }),
  orderId: z.string().uuid().optional().nullable(),
  date: z.string().optional(),
  comment: z.string().optional().nullable(),
});

export type CreateTransactionDto = z.infer<typeof CreateTransactionSchema>;

export const TransactionQuerySchema = z.object({
  type: z.nativeEnum(TransactionType).optional(),
  category: z.nativeEnum(ExpenseCategory).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
});

export type TransactionQueryDto = z.infer<typeof TransactionQuerySchema>;

export interface FilamentYieldMetric {
  totalStockG: number;
  inventoryValuation: number;
  avgCatalogPrice: number;
  avgCatalogWeightG: number;
  avgRevenuePerGram: number;
  potentialModelsCount: number;
  potentialRevenue: number;
  potentialNetProfit: number;
  potentialRoiMultiplier: number;
}

export interface FinancialSummary {
  revenue: number;
  cogs: number;
  opex: number;
  netProfit: number;
  marginPercentage: number;
  unpaidBalance: number;
  inventoryValuation: number;
  filamentYield?: FilamentYieldMetric;
}

export interface MonthlyAnalytics {
  month: string; // YYYY-MM
  revenue: number;
  cogs: number;
  opex: number;
  netProfit: number;
}

export interface TopModelMetric {
  id: string;
  name: string;
  totalQuantity: number;
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
}

export interface TopClientMetric {
  id: string;
  name: string;
  telegramUsername: string | null;
  totalOrders: number;
  totalSpent: number;
}
