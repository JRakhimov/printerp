import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Optional } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
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
    @Optional() private readonly moduleRef?: ModuleRef,
  ) {
    this.botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN') || '';
    const isPlaceholder = !this.botToken || this.botToken.includes('ABCdefGHIjklMNOpqrsTUVwxyZ');
    this.isEnabled = !isPlaceholder;
  }

  onModuleInit() {
    if (this.isEnabled) {
      this.logger.log('🤖 Telegram Bot Service initialized for notifications & commands');
      // Start background long-polling for commands like /start (disabled during test runner)
      if (process.env.NODE_ENV !== 'test') {
        this.startPolling();
      }
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
    if (update.callback_query) {
      await this.handleCallbackQuery(update.callback_query);
      return;
    }

    const message = update.message;
    if (!message || !message.text) return;

    const text = message.text.trim();
    if (text.startsWith('/start')) {
      await this.handleStartCommand(message);
    } else if (text.startsWith('/camera') || text.startsWith('/photo')) {
      await this.handleCameraListCommand(message);
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
   * Process /camera or /photo command - list available printers with inline buttons
   */
  private async handleCameraListCommand(message: any) {
    const chatId = message.chat.id.toString();
    try {
      const printers = await this.prisma.printer.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });

      if (printers.length === 0) {
        await this.sendMessage(chatId, '📭 Активные 3D-принтеры не найдены.');
        return;
      }

      const buttons = printers.map((p) => [
        {
          text: `📸 ${p.name} (${p.model || p.manufacturer})`,
          callback_data: `cam_snap:${p.id}`,
        },
      ]);

      await this.sendMessage(chatId, '📹 <b>Выберите принтер для получения снимка стола:</b>', {
        inline_keyboard: buttons,
      });
    } catch (err: any) {
      this.logger.error(`Error handling /camera command:`, err?.message || err);
    }
  }

  /**
   * Handle inline callback queries from Telegram buttons
   */
  private async handleCallbackQuery(query: any) {
    const data = query.data;
    const chatId = query.message?.chat?.id?.toString();
    if (!data || !chatId) return;

    try {
      await fetch(`https://api.telegram.org/bot${this.botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: query.id }),
      });
    } catch {}

    if (data.startsWith('cam_snap:')) {
      const printerId = data.replace('cam_snap:', '');
      await this.handleCameraSnapshotRequest(chatId, printerId);
    }
  }

  /**
   * Handle camera snapshot request from inline button or command
   */
  private async handleCameraSnapshotRequest(chatId: string, printerId: string) {
    try {
      const printer = await this.prisma.printer.findUnique({
        where: { id: printerId },
      });

      if (!printer) {
        await this.sendMessage(chatId, '⚠️ Принтер не найден.');
        return;
      }

      if (!this.moduleRef) return;

      const { PrinterCameraService } = await import('../printers/printer-camera.service');
      const cameraService = this.moduleRef.get(PrinterCameraService, { strict: false });

      if (!cameraService) {
        await this.sendMessage(chatId, '⚠️ Сервис камеры недоступен.');
        return;
      }

      await this.sendMessage(chatId, `📸 <i>Получаю снимок с камеры принтера ${printer.name}...</i>`);

      const frame = await cameraService.getSnapshot(printerId);
      const timeStr = new Date().toLocaleTimeString('ru-RU', {
        timeZone: this.getTimeZone(),
        hour: '2-digit',
        minute: '2-digit',
      });
      const caption = `📸 <b>${printer.name}</b> (${printer.model || printer.manufacturer})\n🕒 <i>Время: ${timeStr}</i>`;

      await this.sendPhoto(chatId, frame, caption, {
        inline_keyboard: [
          [
            {
              text: '🔄 Обновить фото',
              callback_data: `cam_snap:${printerId}`,
            },
          ],
        ],
      });
    } catch (err: any) {
      this.logger.error(`Failed to handle camera snapshot for printer ${printerId}:`, err?.message || err);
      await this.sendMessage(
        chatId,
        `⚠️ Не удалось получить снимок с камеры принтера: ${err?.message || 'Таймаут'}`,
      );
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
      const orderNumber = `${order.orderNumber}`;
      const clientName = order.client?.instagramUsername || 'Неизвестный клиент';
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
        `📦 <b>Новый заказ ${orderNumber}</b>\n\n` +
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
   * Helper to translate Bambu Lab error codes or reasons to human-readable Russian text
   */
  formatBambuError(errorCode?: number, failReason?: number): string {
    if (failReason === 1) {
      return 'Печать остановлена пользователем';
    }
    if (!errorCode || errorCode === 0) {
      return failReason ? `Код причины: ${failReason}` : 'Неизвестная ошибка принтера';
    }

    const hex = '0x' + (errorCode >>> 0).toString(16).toUpperCase().padStart(8, '0');

    // Categorize by Bambu error masks
    if ((errorCode & 0x0f000000) === 0x05000000) {
      return `Сбой подачи филамента или AMS (${hex})`;
    }
    if ((errorCode & 0x0300f000) === 0x03001000) {
      return `Ошибка нагрева сопла (${hex})`;
    }
    if ((errorCode & 0x0300f000) === 0x03002000) {
      return `Ошибка нагрева стола (${hex})`;
    }
    if ((errorCode & 0x0300f000) === 0x03004000) {
      return `Сбой резака филамента (${hex})`;
    }
    if ((errorCode & 0x0300f000) === 0x03005000) {
      return `Сбой позиционирования / калибровки осей (${hex})`;
    }
    if ((errorCode & 0x0300f000) === 0x03008000) {
      return `Сбой вентилятора охлаждения (${hex})`;
    }

    return `Код ошибки: ${hex}`;
  }

  /**
   * Format human-readable duration (e.g. "2ч 18м", "45м", "3ч")
   */
  formatDuration(minutes: number): string {
    const totalMinutes = Math.round(minutes);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h > 0 && m > 0) return `${h}ч ${m}м`;
    if (h > 0) return `${h}ч`;
    return `${m}м`;
  }

  /**
   * Get configured application timezone (default Asia/Tashkent, UTC+5)
   */
  getTimeZone(): string {
    return (
      this.configService.get<string>('TIMEZONE') ||
      process.env.TIMEZONE ||
      process.env.TZ ||
      'Asia/Tashkent'
    );
  }

  /**
   * Format estimated completion time (e.g. "сегодня в 14:30", "завтра в 02:15", "15.09 в 18:00")
   */
  formatEstimatedFinish(minutes: number, baseDate: Date = new Date()): string {
    const finish = new Date(baseDate.getTime() + minutes * 60_000);
    const timeZone = this.getTimeZone();

    const timeFormatter = new Intl.DateTimeFormat('ru-RU', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const timeStr = timeFormatter.format(finish);

    const dayFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const baseDayParts = dayFormatter.format(baseDate).split('-');
    const finishDayParts = dayFormatter.format(finish).split('-');

    const baseUtcMidnight = Date.UTC(Number(baseDayParts[0]), Number(baseDayParts[1]) - 1, Number(baseDayParts[2]));
    const finishUtcMidnight = Date.UTC(Number(finishDayParts[0]), Number(finishDayParts[1]) - 1, Number(finishDayParts[2]));

    const diffDays = Math.round((finishUtcMidnight - baseUtcMidnight) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `сегодня в ${timeStr}`;
    }
    if (diffDays === 1) {
      return `завтра в ${timeStr}`;
    }

    const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
      timeZone,
      day: '2-digit',
      month: '2-digit',
    });
    return `${dateFormatter.format(finish)} в ${timeStr}`;
  }

  /**
   * Parse estimated duration in minutes from sliced filename
   * e.g. "dragon_2h18m36s.gcode.3mf" -> 138, "box_45m.gcode" -> 45, "part_1h.gcode" -> 60
   */
  parseDurationFromFilename(filename?: string): number | undefined {
    if (!filename) return undefined;
    const match = filename.match(
      /(?:^|[_ -])(?:(\d+)\s*h(?:our(?:s)?)?)?(?:[_\s-]*(\d+)\s*m(?!m)(?:in(?:ute)?(?:s)?)?)?(?:[_\s-]*\d+\s*s)?(?:\.gcode|\.3mf|[_.\s-]|$)/i,
    );
    if (match && (match[1] || match[2])) {
      const hours = match[1] ? parseInt(match[1], 10) : 0;
      const minutes = match[2] ? parseInt(match[2], 10) : 0;
      const total = hours * 60 + minutes;
      if (total > 0) return total;
    }
    return undefined;
  }

  /**
   * Format HTML Telegram message for printer status transitions
   */
  formatPrinterStatusMessage(data: PrinterStatusNotificationData): string {
    const printerTitle = data.printerModel
      ? `<b>${data.printerName}</b> (${data.printerModel})`
      : `<b>${data.printerName}</b>`;

    const remainingMinutes =
      data.remainingMinutes !== undefined && data.remainingMinutes > 0
        ? data.remainingMinutes
        : this.parseDurationFromFilename(data.currentFile);

    const remainingStr = remainingMinutes ? this.formatDuration(remainingMinutes) : null;
    const finishStr = remainingMinutes ? this.formatEstimatedFinish(remainingMinutes) : null;

    const fileLine = data.currentFile ? `📄 <b>Файл:</b> <code>${data.currentFile}</code>\n` : '';
    const orderLine = data.orderNumber ? `📦 <b>Заказ:</b> №${data.orderNumber}\n` : '';
    const clientLine = data.clientName ? `👤 <b>Клиент:</b> ${data.clientName}\n` : '';

    switch (data.eventType) {
      case 'STARTED': {
        const timeLine =
          remainingStr && finishStr
            ? `⏱ <b>Оценка времени:</b> ~${remainingStr}\n🏁 <b>Завершение:</b> ~${finishStr}\n`
            : remainingStr
              ? `⏱ <b>Оценка времени:</b> ~${remainingStr}\n`
              : '';
        const tempsLine =
          data.nozzleTemp !== undefined || data.bedTemp !== undefined
            ? `🌡 <b>Температуры:</b> Сопло: ${Math.round(data.nozzleTemp || 0)}°C | Стол: ${Math.round(data.bedTemp || 0)}°C\n`
            : '';
        const stage = data.isPreparing ? 'Подготовка к печати' : 'Печать запущена';

        return (
          `🚀 <b>${stage}</b>\n\n` +
          `🖨 <b>Принтер:</b> ${printerTitle}\n` +
          `${fileLine}` +
          `${orderLine}` +
          `${clientLine}` +
          `${timeLine}` +
          `${tempsLine}`
        );
      }

      case 'PAUSED': {
        const progressLine = data.progress !== undefined ? `📊 <b>Прогресс:</b> ${Math.round(data.progress)}%\n` : '';
        const timeLine = remainingStr ? `⏱ <b>Оставалось:</b> ~${remainingStr}\n` : '';
        const reasonLine = data.errorMessage ? `⚠️ <b>Причина:</b> ${data.errorMessage}\n` : '';

        return (
          `⏸ <b>Печать приостановлена (Пауза)</b>\n\n` +
          `🖨 <b>Принтер:</b> ${printerTitle}\n` +
          `${fileLine}` +
          `${orderLine}` +
          `${progressLine}` +
          `${timeLine}` +
          `${reasonLine}\n` +
          `💡 <i>Принтер ожидает действий оператора или сработал датчик филамента.</i>`
        );
      }

      case 'RESUMED': {
        const progressLine = data.progress !== undefined ? `📊 <b>Прогресс:</b> ${Math.round(data.progress)}%\n` : '';
        const timeLine =
          remainingStr && finishStr
            ? `⏱ <b>Осталось:</b> ~${remainingStr}\n🏁 <b>Завершение:</b> ~${finishStr}\n`
            : remainingStr
              ? `⏱ <b>Осталось:</b> ~${remainingStr}\n`
              : '';

        return (
          `▶️ <b>Печать возобновлена</b>\n\n` +
          `🖨 <b>Принтер:</b> ${printerTitle}\n` +
          `${fileLine}` +
          `${orderLine}` +
          `${progressLine}` +
          `${timeLine}`
        );
      }

      case 'FINISHED': {
        const durationLine =
          data.printDurationMinutes !== undefined && data.printDurationMinutes > 0
            ? `⏱ <b>Время печати:</b> ${this.formatDuration(data.printDurationMinutes)}\n`
            : '';
        const hoursLine =
          data.totalWorkHours !== undefined && data.totalWorkHours !== null
            ? `🕒 <b>Общий моторесурс принтера:</b> ${data.totalWorkHours} ч\n`
            : '';

        return (
          `✅ <b>Печать успешно завершена!</b>\n\n` +
          `🖨 <b>Принтер:</b> ${printerTitle}\n` +
          `${fileLine}` +
          `${orderLine}` +
          `${clientLine}` +
          `${durationLine}` +
          `${hoursLine}\n` +
          `💡 <i>Не забудьте снять готовую деталь со стола перед следующим запуском.</i>`
        );
      }

      case 'FAILED': {
        const progressLine =
          data.progress !== undefined ? `📊 <b>Прогресс на момент сбоя:</b> ${Math.round(data.progress)}%\n` : '';
        const reasonLine = data.errorMessage
          ? `⚠️ <b>Ошибка:</b> ${data.errorMessage}\n`
          : '⚠️ <b>Сбой задания печати</b>\n';

        return (
          `🚨 <b>Сбой / Ошибка печати!</b>\n\n` +
          `🖨 <b>Принтер:</b> ${printerTitle}\n` +
          `${fileLine}` +
          `${orderLine}` +
          `${progressLine}` +
          `${reasonLine}\n` +
          `❗️ <i>Рекомендуется проверить состояние первого слоя, сопла и филамента.</i>`
        );
      }

      case 'CANCELLED': {
        const progressLine =
          data.progress !== undefined ? `📊 <b>Прогресс на момент отмены:</b> ${Math.round(data.progress)}%\n` : '';

        return (
          `⏹ <b>Печать отменена</b>\n\n` +
          `🖨 <b>Принтер:</b> ${printerTitle}\n` +
          `${fileLine}` +
          `${orderLine}` +
          `${progressLine}`
        );
      }

      default:
        return `ℹ️ Статус принтера ${printerTitle} изменен`;
    }
  }

  /**
   * Send printer status notification to all active system users.
   */
  async notifyPrinterStatus(data: PrinterStatusNotificationData) {
    if (!this.isEnabled) return;

    try {
      const recipients = await this.prisma.user.findMany({
        where: {
          isActive: true,
        },
      });

      if (recipients.length === 0) return;

      const messageText = this.formatPrinterStatusMessage(data);

      const replyMarkup = data.printerId
        ? {
            inline_keyboard: [
              [
                {
                  text: '📸 Снимок с камеры',
                  callback_data: `cam_snap:${data.printerId}`,
                },
              ],
            ],
          }
        : undefined;

      for (const user of recipients) {
        const chatId = user.telegramId.toString();
        if (replyMarkup) {
          this.sendMessage(chatId, messageText, replyMarkup);
        } else {
          this.sendMessage(chatId, messageText);
        }
      }
    } catch (err: any) {
      this.logger.error('Failed to process printer status notification:', err?.message || err);
    }
  }

  /**
   * Helper to send photo via Telegram Bot API
   */
  async sendPhoto(chatId: string, photoBuffer: Buffer, caption?: string, replyMarkup?: any) {
    if (!this.isEnabled) return;

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendPhoto`;
      const formData = new FormData();
      formData.append('chat_id', chatId);
      const blob = new Blob([new Uint8Array(photoBuffer)], { type: 'image/jpeg' });
      formData.append('photo', blob, 'snapshot.jpg');
      if (caption) {
        formData.append('caption', caption);
        formData.append('parse_mode', 'HTML');
      }
      if (replyMarkup) {
        formData.append('reply_markup', JSON.stringify(replyMarkup));
      }

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const body = await response.text();
        this.logger.warn(`Failed to send Telegram photo to ${chatId}: ${body}`);
      }
    } catch (err: any) {
      this.logger.error(`Error sending Telegram photo to ${chatId}:`, err?.message || err);
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

export type PrinterEventType =
  | 'STARTED'
  | 'PAUSED'
  | 'RESUMED'
  | 'FINISHED'
  | 'FAILED'
  | 'CANCELLED';

export interface PrinterStatusNotificationData {
  printerId?: string;
  printerName: string;
  printerModel?: string;
  eventType: PrinterEventType;
  isPreparing?: boolean;
  currentFile?: string;
  progress?: number;
  remainingMinutes?: number;
  printDurationMinutes?: number;
  nozzleTemp?: number;
  bedTemp?: number;
  orderNumber?: number;
  clientName?: string;
  totalWorkHours?: number;
  errorCode?: number;
  errorMessage?: string;
}
