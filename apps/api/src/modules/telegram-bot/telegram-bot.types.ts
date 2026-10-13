/**
 * Minimal subset of Telegram Bot API types used by this service.
 * See https://core.telegram.org/bots/api#available-types
 */

export interface TelegramUser {
  id: number;
  first_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
}

export interface TelegramMessage {
  message_id: number;
  chat: TelegramChat;
  from?: TelegramUser;
  text?: string;
}

export interface TelegramCallbackQuery {
  id: string;
  from: TelegramUser;
  message?: TelegramMessage;
  data?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

export interface InlineKeyboardButton {
  text: string;
  callback_data?: string;
  web_app?: { url: string };
}

export interface InlineKeyboardMarkup {
  inline_keyboard: InlineKeyboardButton[][];
}

/**
 * Order fields used to build the "new order" notification.
 */
export interface NewOrderNotification {
  orderNumber: number;
  finalPrice: number;
  deadline: Date | string | null;
  comment: string | null;
  client?: {
    name: string | null;
    telegramUsername: string | null;
    instagramUsername: string | null;
    phone: string | null;
    city: string | null;
  } | null;
  items?: { projectNameSnapshot: string; quantity: number }[];
}
