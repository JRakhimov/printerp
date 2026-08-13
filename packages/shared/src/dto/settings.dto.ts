import { z } from 'zod';

export const UpdateFinancialSettingsSchema = z.object({
  defaultMarkupPercentage: z.number().min(0, { message: 'Markup percentage cannot be negative' }),
  electricityCostPerKwh: z.number().min(0, { message: 'Electricity cost cannot be negative' }),
  hourlyLaborRate: z.number().min(0, { message: 'Labor rate cannot be negative' }),
});

export type UpdateFinancialSettingsDto = z.infer<typeof UpdateFinancialSettingsSchema>;

export interface FinancialSettingsResponse {
  defaultMarkupPercentage: number;
  electricityCostPerKwh: number;
  hourlyLaborRate: number;
}
