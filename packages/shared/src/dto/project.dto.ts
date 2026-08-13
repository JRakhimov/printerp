import { z } from 'zod';

export const ProjectFilamentInputSchema = z.object({
  filamentId: z.string().uuid('Invalid filament ID'),
  grams: z.number().int().positive('Grams must be positive'),
});

export type ProjectFilamentInputDto = z.infer<typeof ProjectFilamentInputSchema>;

export const CreateProjectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional().nullable(),
  modelUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')).nullable(),
  imageUrl: z.string().url('Must be a valid URL').optional().or(z.literal('')).nullable(),
  sizeXMm: z.number().int().min(0).optional().nullable(),
  sizeYMm: z.number().int().min(0).optional().nullable(),
  sizeZMm: z.number().int().min(0).optional().nullable(),
  printTimeMinutes: z.number().int().min(0).optional().nullable(),
  defaultPrice: z.number().min(0, 'Price cannot be negative').default(0),
  defaultCost: z.number().int().optional(), // If omitted, calculated automatically
  extraCost: z.number().min(0).default(0),
  notes: z.string().optional().nullable(),
  filaments: z.array(ProjectFilamentInputSchema).optional().default([]),
});

export type CreateProjectDto = z.infer<typeof CreateProjectSchema>;

export const UpdateProjectSchema = CreateProjectSchema.partial();

export type UpdateProjectDto = z.infer<typeof UpdateProjectSchema>;

export const ProjectQuerySchema = z.object({
  search: z.string().optional(),
});

export type ProjectQueryDto = z.infer<typeof ProjectQuerySchema>;
