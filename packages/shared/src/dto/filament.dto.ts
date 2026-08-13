import { z } from 'zod';
import { FilamentMaterial } from '../enums/index.js';

export const CreateFilamentSchema = z.object({
  brand: z.string().min(1, 'Brand is required'),
  name: z.string().min(1, 'Filament name is required'),
  material: z.nativeEnum(FilamentMaterial).optional().default(FilamentMaterial.PLA),
  color: z.string().optional().nullable(),
  pricePerSpool: z.number().int().min(0, 'Price must be non-negative'),
  spoolWeightG: z.number().int().positive('Spool weight must be greater than 0'),
  stockG: z.number().int().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type CreateFilamentDto = z.infer<typeof CreateFilamentSchema>;

export const UpdateFilamentSchema = CreateFilamentSchema.partial();

export type UpdateFilamentDto = z.infer<typeof UpdateFilamentSchema>;

export const FilamentQuerySchema = z.object({
  search: z.string().optional(),
  material: z.nativeEnum(FilamentMaterial).optional(),
});

export type FilamentQueryDto = z.infer<typeof FilamentQuerySchema>;
