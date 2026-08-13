import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TelegramBotService implements OnModuleInit {
  private readonly logger = new Logger(TelegramBotService.name);
  private readonly botToken: string;
  private readonly isEnabled: boolean;

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
      this.logger.log('🤖 Telegram Bot Service initialized for notifications');
    } else {
      this.logger.warn('⚠️ Telegram Bot Token not set or using placeholder. Notifications disabled.');
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
      
      const itemsList = order.items
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
  private async sendMessage(chatId: string, text: string) {
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
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
