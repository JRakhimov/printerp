import { z } from 'zod';
import { ClientSource } from '../enums/index.js';

export const CreateClientSchema = z.object({
  name: z.string().min(1, 'Client name is required'),
  telegramUsername: z.string().optional().nullable(),
  instagramUsername: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  source: z.nativeEnum(ClientSource).optional().default(ClientSource.INSTAGRAM),
  notes: z.string().optional().nullable(),
});

export type CreateClientDto = z.infer<typeof CreateClientSchema>;

export const UpdateClientSchema = CreateClientSchema.partial();

export type UpdateClientDto = z.infer<typeof UpdateClientSchema>;

export const ClientQuerySchema = z.object({
  search: z.string().optional(),
  source: z.nativeEnum(ClientSource).optional(),
});

export type ClientQueryDto = z.infer<typeof ClientQuerySchema>;
