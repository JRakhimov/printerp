import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TelegramBotService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TelegramBotService.name);
  private readonly botToken: string;
  private readonly isEnabled: boolean;
  private isPolling = false;
  private updateOffset = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN') || '';
    const isPlaceholder = !this.botToken || this.botToken.includes('ABCdefGHIjklMNOpqrsTUVwxyZ');
    this.isEnabled = !isPlaceholder;
  }

  onModuleInit() {
    if (this.isEnabled) {
      this.logger.log('🤖 Telegram Bot Service initialized for notifications & commands');
      // Start background long-polling for commands like /start
      this.startPolling();
    } else {
      this.logger.warn('⚠️ Telegram Bot Token not set or using placeholder. Notifications and commands disabled.');
    }
  }

  onModuleDestroy() {
    this.isPolling = false;
  }

  /**
   * Background long-polling listener for Telegram bot commands (/start).
   */
  private async startPolling() {
    this.isPolling = true;

    while (this.isPolling) {
      try {
        const url = `https://api.telegram.org/bot${this.botToken}/getUpdates?offset=${this.updateOffset}&timeout=20`;
        const res = await fetch(url);

        if (!res.ok) {
          await new Promise((r) => setTimeout(r, 5000));
          continue;
        }

        const data = await res.json();
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            this.updateOffset = update.update_id + 1;
            await this.handleUpdate(update);
          }
        }
      } catch (err: any) {
        if (this.isPolling) {
          this.logger.error('Error in Telegram getUpdates polling:', err?.message || err);
          await new Promise((r) => setTimeout(r, 5000));
        }
      }
    }
  }

  /**
   * Handle incoming updates from Telegram
   */
  private async handleUpdate(update: any) {
    const message = update.message;
    if (!message || !message.text) return;

    const text = message.text.trim();
    if (text.startsWith('/start')) {
      await this.handleStartCommand(message);
    }
  }

  /**
   * Process /start command
   */
  private async handleStartCommand(message: any) {
    const chatId = message.chat.id.toString();
    const telegramIdBigInt = BigInt(message.from.id);
    const senderFirstName = message.from.first_name || message.from.username || 'Пользователь';

    try {
      // Query DB for user in allowlist
      const dbUser = await this.prisma.user.findUnique({
        where: { telegramId: telegramIdBigInt },
      });

      if (dbUser && dbUser.isActive) {
        // System user is allowed & active
        const originsEnv = this.configService.get<string>('ALLOWED_ORIGINS') || 'https://printerp.y3110w.com';
        const webAppUrl = originsEnv.split(',')[0].trim();

        const replyText =
          `👋 <b>Здравствуйте, ${dbUser.firstName || senderFirstName}!</b>\n\n` +
          `Добро пожаловать в <b>3D Print ERP</b> — систему управления вашей мастерской 3D-печати.\n\n` +
          `Вы авторизованы в белом списке. Нажмите кнопку ниже, чтобы открыть приложение:`;

        await this.sendMessage(chatId, replyText, {
          inline_keyboard: [
            [
              {
                text: '🚀 Открыть 3D Print ERP',
                web_app: { url: webAppUrl },
              },
            ],
          ],
        });
      } else {
        // Access Denied: not in allowlist or disabled
        const replyText =
          `⛔️ <b>Доступ запрещён!</b>\n\n` +
          `Ваш Telegram ID (<code>${message.from.id}</code>) отсутствует в белом списке системы 3D Print ERP или ваш аккаунт деактивирован.\n\n` +
          `Пожалуйста, обратитесь к администратору мастерской для добавления вашего Telegram ID в систему.`;

        await this.sendMessage(chatId, replyText);
      }
    } catch (err: any) {
      this.logger.error(`Error processing /start for chat ${chatId}:`, err?.message || err);
    }
  }

  /**
   * Send notification to all active system users except the creator of the order.
   */
  async notifyNewOrder(order: any, creatorUserId?: string) {
    if (!this.isEnabled) return;

    try {
      // 1. Fetch active users excluding creator
      const recipients = await this.prisma.user.findMany({
        where: {
          isActive: true,
          ...(creatorUserId ? { id: { not: creatorUserId } } : {}),
        },
      });

      if (recipients.length === 0) {
        return;
      }

      // 2. Format notification text
      const orderNumber = `#100${order.orderNumber}`;
      const clientName = order.client?.name || 'Неизвестный клиент';
      const finalPrice = Number(order.finalPrice || 0).toLocaleString('ru-RU');

      const itemsList =
        order.items
          ?.map((item: any) => `  • <b>${item.projectNameSnapshot}</b> (x${item.quantity})`)
          .join('\n') || '  • Нет позиций';

      const deadlineText = order.deadline
        ? `\n⏱ <b>Срок:</b> ${new Date(order.deadline).toLocaleDateString('ru-RU')}`
        : '';

      const commentText = order.comment ? `\n💬 <b>Коммент:</b> ${order.comment}` : '';

      const messageText =
        `📦 <b>Новый заказ ${orderNumber}!</b>\n\n` +
        `👤 <b>Клиент:</b> ${clientName}\n` +
        `💰 <b>Сумма:</b> ${finalPrice} сум\n` +
        `📝 <b>Позиции:</b>\n${itemsList}` +
        `${deadlineText}` +
        `${commentText}`;

      // 3. Send message asynchronously to each recipient's Telegram ID
      for (const user of recipients) {
        const chatId = user.telegramId.toString();
        this.sendMessage(chatId, messageText);
      }
    } catch (err: any) {
      this.logger.error('Failed to process new order notification:', err?.message || err);
    }
  }

  /**
   * Low-level helper to send message via Telegram Bot API
   */
  private async sendMessage(chatId: string, text: string, replyMarkup?: any) {
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.warn(`Failed to send Telegram message to ${chatId}: ${body}`);
      }
    } catch (err: any) {
      this.logger.error(`Error sending Telegram message to ${chatId}:`, err?.message || err);
    }
  }
}
