import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TelegramBotService, PrinterStatusNotificationData } from '../src/modules/telegram-bot/telegram-bot.service';
import { BambuMqttService } from '../src/modules/printers/bambu-mqtt.service';
import { PrismaService } from '../src/database/prisma.service';

describe('Printer Status Telegram Notifications', () => {
  let telegramBotService: TelegramBotService;
  let bambuMqttService: BambuMqttService;

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
    },
    printer: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    printJob: {
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    order: {
      update: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'TELEGRAM_BOT_TOKEN') return '123456789:TEST_BOT_TOKEN';
      if (key === 'ALLOWED_ORIGINS') return 'https://printerp.example.com';
      return null;
    }),
  };

  let module: TestingModule;

  beforeEach(async () => {
    jest.clearAllMocks();

    module = await Test.createTestingModule({
      providers: [
        TelegramBotService,
        BambuMqttService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    telegramBotService = module.get<TelegramBotService>(TelegramBotService);
    bambuMqttService = module.get<BambuMqttService>(BambuMqttService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('TelegramBotService formatting & delivery', () => {
    it('should format Bambu Lab error codes into friendly Russian descriptions', () => {
      expect(telegramBotService.formatBambuError(undefined, 1)).toBe('Печать остановлена пользователем');
      expect(telegramBotService.formatBambuError(0x05002001)).toContain('Сбой подачи филамента или AMS');
      expect(telegramBotService.formatBambuError(0x03001001)).toContain('Ошибка нагрева сопла');
      expect(telegramBotService.formatBambuError(0x03002001)).toContain('Ошибка нагрева стола');
      expect(telegramBotService.formatBambuError(0x03004001)).toContain('Сбой резака филамента');
      expect(telegramBotService.formatBambuError(0x03005001)).toContain('Сбой позиционирования / калибровки осей');
      expect(telegramBotService.formatBambuError(0x03008001)).toContain('Сбой вентилятора охлаждения');
    });

    it('should format STARTED notification text with parameters', () => {
      const data: PrinterStatusNotificationData = {
        printerName: 'Bambu Lab X1C #1',
        printerModel: 'X1C',
        eventType: 'STARTED',
        isPreparing: true,
        currentFile: 'dragon_statue.gcode.3mf',
        remainingMinutes: 125,
        nozzleTemp: 220,
        bedTemp: 60,
        orderNumber: 204,
        clientName: '@alex_3d',
      };

      const message = telegramBotService.formatPrinterStatusMessage(data);
      expect(message).toContain('Подготовка к печати');
      expect(message).toContain('Bambu Lab X1C #1');
      expect(message).toContain('dragon_statue.gcode.3mf');
      expect(message).toContain('№204');
      expect(message).toContain('@alex_3d');
      expect(message).toContain('2ч 5м');
      expect(message).toContain('220°C');
    });

    it('should format PAUSED and FINISHED notifications correctly', () => {
      const pausedMsg = telegramBotService.formatPrinterStatusMessage({
        printerName: 'Bambu Lab P1S',
        printerModel: 'P1S',
        eventType: 'PAUSED',
        currentFile: 'gear.3mf',
        progress: 45,
        remainingMinutes: 60,
        errorMessage: 'Закончился филамент',
      });
      expect(pausedMsg).toContain('Печать приостановлена (Пауза)');
      expect(pausedMsg).toContain('45%');
      expect(pausedMsg).toContain('Закончился филамент');

      const finishedMsg = telegramBotService.formatPrinterStatusMessage({
        printerName: 'Bambu Lab P1S',
        printerModel: 'P1S',
        eventType: 'FINISHED',
        currentFile: 'gear.3mf',
        totalWorkHours: 128.5,
        orderNumber: 15,
      });
      expect(finishedMsg).toContain('Печать успешно завершена');
      expect(finishedMsg).toContain('128.5 ч');
      expect(finishedMsg).toContain('№15');
    });

    it('should send notification to all active system users', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'u-1', telegramId: BigInt(111222333), isActive: true },
        { id: 'u-2', telegramId: BigInt(444555666), isActive: true },
      ]);

      const sendSpy = jest.spyOn<any, any>(telegramBotService, 'sendMessage').mockResolvedValue(undefined);

      await telegramBotService.notifyPrinterStatus({
        printerName: 'Bambu Lab A1',
        eventType: 'STARTED',
        currentFile: 'test.gcode',
      });

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({ where: { isActive: true } });
      expect(sendSpy).toHaveBeenCalledTimes(2);
      expect(sendSpy).toHaveBeenCalledWith('111222333', expect.any(String));
      expect(sendSpy).toHaveBeenCalledWith('444555666', expect.any(String));
    });
  });

  describe('BambuMqttService status transition handling', () => {
    it('should trigger STARTED notification on transition from IDLE to RUNNING', async () => {
      const notifySpy = jest.spyOn(telegramBotService, 'notifyPrinterStatus').mockResolvedValue(undefined);

      bambuMqttService.connectPrinter({
        id: 'printer-p1s',
        name: 'Workshop P1S',
        model: 'P1S',
        ipAddress: '192.168.1.100',
        accessCode: '12345678',
        serialNumber: '01P00A123',
      });

      mockPrismaService.printer.update.mockResolvedValue({});
      mockPrismaService.printJob.findFirst.mockResolvedValue({
        id: 'job-1',
        orderId: 'order-1',
        filename: 'box.3mf',
        order: { orderNumber: 101, client: { instagramUsername: 'client_insta' } },
      });

      // 1. First report initializes state as IDLE
      await bambuMqttService.handlePrinterReport('printer-p1s', {
        print: { gcode_state: 'IDLE' },
      });
      expect(notifySpy).not.toHaveBeenCalled();

      // 2. Transition to RUNNING triggers notification
      await bambuMqttService.handlePrinterReport('printer-p1s', {
        print: {
          gcode_state: 'RUNNING',
          subtask_name: 'box.3mf',
          mc_percent: 2,
          mc_remaining_time: 90,
          nozzle_temper: 215,
          bed_temper: 55,
        },
      });

      expect(notifySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          printerName: 'Workshop P1S',
          printerModel: 'P1S',
          eventType: 'STARTED',
          currentFile: 'box.3mf',
          orderNumber: 101,
          clientName: '@client_insta',
        }),
      );
    });

    it('should trigger PAUSED, RESUMED and FINISHED transitions in sequence', async () => {
      const notifySpy = jest.spyOn(telegramBotService, 'notifyPrinterStatus').mockResolvedValue(undefined);

      bambuMqttService.connectPrinter({
        id: 'printer-x1c',
        name: 'Workshop X1C',
        model: 'X1C',
        ipAddress: '192.168.1.101',
        accessCode: '87654321',
        serialNumber: '01X00B456',
      });

      mockPrismaService.printer.update.mockResolvedValue({});
      mockPrismaService.printer.findUnique.mockResolvedValue({
        initialWorkHours: 50,
        trackedWorkMinutes: 120, // 2 hours -> 52.0 hours total
      });

      // 1. Initial state RUNNING
      await bambuMqttService.handlePrinterReport('printer-x1c', {
        print: { gcode_state: 'RUNNING', subtask_name: 'vase.3mf' },
      });
      notifySpy.mockClear();

      // 2. Pause
      await bambuMqttService.handlePrinterReport('printer-x1c', {
        print: {
          gcode_state: 'PAUSED',
          subtask_name: 'vase.3mf',
          mc_percent: 50,
          mc_remaining_time: 30,
        },
      });
      expect(notifySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'PAUSED',
          progress: 50,
        }),
      );
      notifySpy.mockClear();

      // 3. Resume
      await bambuMqttService.handlePrinterReport('printer-x1c', {
        print: {
          gcode_state: 'RUNNING',
          subtask_name: 'vase.3mf',
          mc_percent: 51,
        },
      });
      expect(notifySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'RESUMED',
          progress: 51,
        }),
      );
      notifySpy.mockClear();

      // 4. Finish
      await bambuMqttService.handlePrinterReport('printer-x1c', {
        print: {
          gcode_state: 'FINISH',
          subtask_name: 'vase.3mf',
        },
      });
      expect(notifySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'FINISHED',
          totalWorkHours: 52.0,
        }),
      );
    });

    it('should trigger CANCELLED on user cancel or FAILED on error', async () => {
      const notifySpy = jest.spyOn(telegramBotService, 'notifyPrinterStatus').mockResolvedValue(undefined);

      bambuMqttService.connectPrinter({
        id: 'printer-a1',
        name: 'Workshop A1',
        model: 'A1 Mini',
        ipAddress: '192.168.1.102',
        accessCode: '11223344',
        serialNumber: '01A00C789',
      });

      mockPrismaService.printer.update.mockResolvedValue({});

      // Set initial status to RUNNING
      await bambuMqttService.handlePrinterReport('printer-a1', {
        print: { gcode_state: 'RUNNING' },
      });
      notifySpy.mockClear();

      // Cancel by user (fail_reason = 1)
      await bambuMqttService.handlePrinterReport('printer-a1', {
        print: { gcode_state: 'FAILED', fail_reason: 1, mc_percent: 15 },
      });
      expect(notifySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'CANCELLED',
          progress: 15,
        }),
      );
    });
  });
});
