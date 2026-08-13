import { z } from 'zod';
import { Role } from '../enums/index.js';

export const TelegramAuthSchema = z.object({
  initData: z.string().min(1, 'initData is required'),
});

export type TelegramAuthDto = z.infer<typeof TelegramAuthSchema>;

export interface AuthUserResponse {
  id: string;
  telegramId: string;
  telegramUsername: string | null;
  firstName: string | null;
  lastName: string | null;
  role: Role;
  isActive: boolean;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUserResponse;
}
