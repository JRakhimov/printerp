import { z } from 'zod';
import { ClientSource } from '../enums/index.js';

export const CreateClientSchema = z.object({
  name: z.string().optional().nullable(),
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

export function getClientDisplayName(client?: {
  name?: string | null;
  telegramUsername?: string | null;
  instagramUsername?: string | null;
  phone?: string | null;
  city?: string | null;
} | null): string {
  if (!client) return 'Клиент';

  let handle = '';
  if (client.instagramUsername && client.instagramUsername.trim()) {
    const raw = client.instagramUsername.trim();
    handle = raw.startsWith('@') ? raw : `@${raw}`;
  } else if (client.name && client.name.trim()) {
    handle = client.name.trim();
  } else if (client.telegramUsername && client.telegramUsername.trim()) {
    const raw = client.telegramUsername.trim();
    handle = raw.startsWith('@') ? raw : `@${raw}`;
  } else if (client.phone && client.phone.trim()) {
    handle = client.phone.trim();
  } else {
    handle = 'Клиент';
  }

  const city = client.city && client.city.trim() ? client.city.trim() : '';
  if (city) {
    return `${handle}, ${city}`;
  }
  return handle;
}
