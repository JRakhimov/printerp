import { z } from 'zod';
import { Role } from '../enums/index.js';

export const CreateUserSchema = z.object({
  telegramId: z.string().min(1, { message: 'Telegram ID is required' }),
  telegramUsername: z.string().optional().nullable(),
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  role: z.nativeEnum(Role).default(Role.USER),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  firstName: z.string().optional().nullable(),
  lastName: z.string().optional().nullable(),
  telegramUsername: z.string().optional().nullable(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;

