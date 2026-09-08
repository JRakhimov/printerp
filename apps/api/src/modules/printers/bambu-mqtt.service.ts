import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';
import { OrderStatus, PrintJobStatus } from '@printerp/shared';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mqtt = require('mqtt');

type MqttClient = any;
type IClientOptions = any;

export interface BambuTelemetry {
  gcodeState?: string;
  percent?: number;
  remainingMinutes?: number;
  nozzleTemp?: number;
  bedTemp?: number;
  currentFile?: string;
}

@Injectable()
export class BambuMqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BambuMqttService.name);
  private clients = new Map<string, MqttClient>();
  private lastRunningTimestamps = new Map<string, number>();
  private pendingWorkMinutes = new Map<string, number>();
  private lastKnownStatus = new Map<string, string>();
  private printerInfo = new Map<string, { name: string; model: string }>();
  private lastNotifiedStart = new Map<string, string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramBotService: TelegramBotService,
  ) {}

  async onModuleInit() {
    await this.initAllPrinters();
  }

  async onModuleDestroy() {
    for (const [printerId, client] of this.clients.entries()) {
      try {
        client.end(true);
        this.logger.log(`Disconnected MQTT client for printer ${printerId}`);
      } catch (err) {
        this.logger.error(`Error disconnecting printer ${printerId}`, err);
      }
    }
    this.clients.clear();
    this.lastKnownStatus.clear();
    this.printerInfo.clear();
    this.lastNotifiedStart.clear();

    for (const [printerId, minutes] of this.pendingWorkMinutes.entries()) {
      if (minutes > 0) {
        try {
          await this.prisma.printer.update({
            where: { id: printerId },
            data: { trackedWorkMinutes: { increment: Math.round(minutes * 100) / 100 } },
          });
        } catch (err) {
          // ignore on shutdown
        }
      }
    }
    this.pendingWorkMinutes.clear();
    this.lastRunningTimestamps.clear();
  }

  async initAllPrinters() {
    try {
      const printers = await this.prisma.printer.findMany({
        where: {
          isActive: true,
          ipAddress: { not: null },
          accessCode: { not: null },
        },
      });

      for (const printer of printers) {
        this.printerInfo.set(printer.id, { name: printer.name, model: printer.model });
        if (printer.lastStatus) {
          this.lastKnownStatus.set(printer.id, printer.lastStatus);
        }
        this.connectPrinter(printer);
      }
    } catch (err) {
      this.logger.error('Failed to initialize Bambu Lab printers from DB', err);
    }
  }

  connectPrinter(printer: {
    id: string;
    name: string;
    model?: string;
    ipAddress: string | null;
    accessCode: string | null;
    serialNumber: string | null;
  }) {
    if (!printer.ipAddress || !printer.accessCode) return;

    this.printerInfo.set(printer.id, {
      name: printer.name,
      model: printer.model || this.printerInfo.get(printer.id)?.model || 'Bambu Lab',
    });

    // If client already exists, disconnect first
    this.disconnectPrinter(printer.id);

    const cleanIp = printer.ipAddress.replace(/^https?:\/\//i, '').replace(/:.*$/, '').trim();
    const cleanAccessCode = printer.accessCode.trim();
    const cleanSerial = printer.serialNumber?.trim().toUpperCase() || null;

    const options: IClientOptions = {
      host: cleanIp,
      port: 8883,
      family: 4,
      protocol: 'mqtts',
      protocolVersion: 4, // Bambu Lab strictly requires MQTT 3.1.1
      username: 'bblp',
      password: cleanAccessCode,
      rejectUnauthorized: false,
      checkServerIdentity: () => undefined,
      connectTimeout: 6000,
      reconnectPeriod: 15000,
      clean: true,
      keepalive: 60,
      clientId: cleanSerial ? `bblp_${cleanSerial}` : `bblp_${Math.random().toString(16).slice(2, 8)}`,
      tls: {
        rejectUnauthorized: false,
        checkServerIdentity: () => undefined,
        family: 4,
      },
    };

    try {
      this.logger.log(`Connecting to Bambu printer "${printer.name}" at ${cleanIp}:8883...`);
      const client = mqtt.connect(options);
      this.clients.set(printer.id, client);

      const topic = cleanSerial
        ? `device/${cleanSerial}/report`
        : 'device/+/report';

      client.on('connect', () => {
        this.logger.log(`✅ Connected to Bambu printer "${printer.name}" via MQTT`);
        client.subscribe(topic, (err: any) => {
          if (err) {
            this.logger.error(`Failed to subscribe to topic ${topic} for "${printer.name}":`, err);
          } else {
            this.logger.log(`Subscribed to topic ${topic}`);
            this.requestPushAll(client, cleanSerial);
          }
        });
      });

      client.on('message', async (_topic, message) => {
        try {
          const payload = JSON.parse(message.toString());
          await this.handlePrinterReport(printer.id, payload);
        } catch (err) {
          this.logger.warn(`Failed to parse MQTT message from "${printer.name}": ${err}`);
        }
      });

      client.on('error', (err) => {
        this.logger.warn(`MQTT error on "${printer.name}": ${err.message}`);
      });

      client.on('offline', () => {
        this.logger.log(`Printer "${printer.name}" went offline`);
      });
    } catch (err) {
      this.logger.error(`Error setting up MQTT client for "${printer.name}"`, err);
    }
  }

  disconnectPrinter(printerId: string) {
    const existing = this.clients.get(printerId);
    if (existing) {
      try {
        existing.end(true);
      } catch (err) {
        this.logger.error(`Error closing MQTT client for printer ${printerId}`, err);
      }
      this.clients.delete(printerId);
    }

    const pending = this.pendingWorkMinutes.get(printerId) || 0;
    if (pending > 0) {
      this.prisma.printer.update({
        where: { id: printerId },
        data: { trackedWorkMinutes: { increment: Math.round(pending * 100) / 100 } },
      }).catch(() => {});
      this.pendingWorkMinutes.delete(printerId);
    }
    this.lastRunningTimestamps.delete(printerId);
    this.lastKnownStatus.delete(printerId);
    this.lastNotifiedStart.delete(printerId);
  }

  private requestPushAll(client: MqttClient, serialNumber: string | null) {
    const requestTopic = serialNumber
      ? `device/${serialNumber}/request`
      : 'device/default/request';

    const pushPayload = JSON.stringify({
      pushing: {
        sequence_id: '0',
        command: 'pushall',
      },
    });

    client.publish(requestTopic, pushPayload, { qos: 0 });
  }

  async handlePrinterReport(printerId: string, payload: any) {
    const printData = payload.print;
    if (!printData) return;

    const gcodeState = printData.gcode_state; // IDLE, RUNNING, PAUSED, FINISH, FAILED, PREPARE
    const percent = printData.mc_percent !== undefined ? Number(printData.mc_percent) : undefined;
    const remainingMinutes = printData.mc_remaining_time !== undefined ? Number(printData.mc_remaining_time) : undefined;
    const nozzleTemp = printData.nozzle_temper !== undefined ? Number(printData.nozzle_temper) : undefined;
    const bedTemp = printData.bed_temper !== undefined ? Number(printData.bed_temper) : undefined;
    const currentFile = printData.subtask_name || printData.gcode_file || undefined;
    const printError = printData.print_error !== undefined ? Number(printData.print_error) : 0;
    const failReason = printData.fail_reason !== undefined ? Number(printData.fail_reason) : 0;

    const updateData: any = {
      lastSeenAt: new Date(),
    };

    if (gcodeState !== undefined) {
      updateData.lastStatus = gcodeState;
    }
    if (percent !== undefined) {
      updateData.printProgress = percent;
    }
    if (remainingMinutes !== undefined) {
      updateData.remainingMinutes = remainingMinutes;
    }
    if (nozzleTemp !== undefined) {
      updateData.nozzleTemp = nozzleTemp;
    }
    if (bedTemp !== undefined) {
      updateData.bedTemp = bedTemp;
    }
    if (currentFile !== undefined) {
      updateData.currentFile = currentFile;
    }

    // Accumulate print working time
    if (gcodeState === 'RUNNING') {
      const now = Date.now();
      const lastTime = this.lastRunningTimestamps.get(printerId);
      let addedMinutes = 0;

      if (lastTime) {
        const diffMs = now - lastTime;
        // Accept valid report interval between 500ms and 2 minutes
        if (diffMs >= 500 && diffMs <= 120_000) {
          addedMinutes = diffMs / 60_000;
        }
      }
      this.lastRunningTimestamps.set(printerId, now);

      if (addedMinutes > 0) {
        const currentPending = (this.pendingWorkMinutes.get(printerId) || 0) + addedMinutes;
        // Batch DB update: flush if accumulated at least 0.5 minutes (30 seconds)
        if (currentPending >= 0.5) {
          updateData.trackedWorkMinutes = { increment: Math.round(currentPending * 100) / 100 };
          this.pendingWorkMinutes.set(printerId, 0);
        } else {
          this.pendingWorkMinutes.set(printerId, currentPending);
        }
      }
    } else if (gcodeState !== undefined) {
      const pending = this.pendingWorkMinutes.get(printerId) || 0;
      if (pending > 0) {
        updateData.trackedWorkMinutes = { increment: Math.round(pending * 100) / 100 };
        this.pendingWorkMinutes.set(printerId, 0);
      }
      this.lastRunningTimestamps.delete(printerId);
    }

    await this.prisma.printer.update({
      where: { id: printerId },
      data: updateData,
    });

    // Auto sync with Order & PrintJob if printing or finished
    if (gcodeState === 'RUNNING') {
      await this.handlePrintStarted(printerId, currentFile);
    } else if (gcodeState === 'FINISH') {
      await this.handlePrintFinished(printerId);
    }

    // Check status transition for Telegram notification to admins
    if (gcodeState !== undefined) {
      const prevStatus = this.lastKnownStatus.get(printerId);
      if (prevStatus === undefined) {
        this.lastKnownStatus.set(printerId, gcodeState);
      } else if (prevStatus !== gcodeState) {
        this.lastKnownStatus.set(printerId, gcodeState);
        await this.handleStatusTransition(printerId, prevStatus, gcodeState, {
          percent,
          remainingMinutes,
          nozzleTemp,
          bedTemp,
          currentFile,
          printError,
          failReason,
        });
      }
    }
  }

  private async handlePrintStarted(printerId: string, filename?: string) {
    // Find active or queued job for this printer
    const activeJob = await this.prisma.printJob.findFirst({
      where: {
        printerId,
        status: { in: [PrintJobStatus.QUEUED, PrintJobStatus.PAUSED] },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (activeJob) {
      await this.prisma.printJob.update({
        where: { id: activeJob.id },
        data: {
          status: PrintJobStatus.PRINTING,
          startedAt: activeJob.startedAt || new Date(),
          filename: filename || activeJob.filename,
        },
      });

      // Update parent order to PRINTING
      await this.prisma.order.update({
        where: { id: activeJob.orderId },
        data: { status: OrderStatus.PRINTING },
      });
    }
  }

  private async handlePrintFinished(printerId: string) {
    const activeJob = await this.prisma.printJob.findFirst({
      where: {
        printerId,
        status: PrintJobStatus.PRINTING,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (activeJob) {
      await this.prisma.printJob.update({
        where: { id: activeJob.id },
        data: {
          status: PrintJobStatus.FINISHED,
          finishedAt: new Date(),
        },
      });

      // Check if all print jobs for this order are completed
      const remainingUnfinishedJobs = await this.prisma.printJob.count({
        where: {
          orderId: activeJob.orderId,
          status: { in: [PrintJobStatus.QUEUED, PrintJobStatus.PRINTING, PrintJobStatus.PAUSED] },
        },
      });

      if (remainingUnfinishedJobs === 0) {
        await this.prisma.order.update({
          where: { id: activeJob.orderId },
          data: { status: OrderStatus.PRINTED },
        });
      }
    }
  }

  private async handleStatusTransition(
    printerId: string,
    prevStatus: string,
    newStatus: string,
    telemetry: {
      percent?: number;
      remainingMinutes?: number;
      nozzleTemp?: number;
      bedTemp?: number;
      currentFile?: string;
      printError?: number;
      failReason?: number;
    },
  ) {
    try {
      const pInfo = this.printerInfo.get(printerId) || { name: '3D Принтер', model: 'Bambu Lab' };
      const printerName = pInfo.name;
      const printerModel = pInfo.model;

      // Try to find active or related print job and order
      const activeJob = await this.prisma.printJob.findFirst({
        where: {
          printerId,
          status: {
            in: [
              PrintJobStatus.PRINTING,
              PrintJobStatus.QUEUED,
              PrintJobStatus.PAUSED,
              PrintJobStatus.FINISHED,
            ],
          },
        },
        include: {
          order: {
            select: {
              orderNumber: true,
              client: { select: { name: true, instagramUsername: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const orderNumber = activeJob?.order?.orderNumber;
      const clientName = activeJob?.order?.client?.instagramUsername
        ? `@${activeJob.order.client.instagramUsername}`
        : activeJob?.order?.client?.name || undefined;

      const currentFile = telemetry.currentFile || activeJob?.filename || undefined;

      // 1. STARTED
      // Triggered when entering PREPARE or RUNNING from a non-printing state (IDLE, FINISH, FAILED, or empty)
      const isStart =
        (newStatus === 'PREPARE' || newStatus === 'RUNNING') &&
        prevStatus !== 'PREPARE' &&
        prevStatus !== 'RUNNING' &&
        prevStatus !== 'PAUSED';

      if (isStart) {
        this.lastNotifiedStart.set(printerId, currentFile || 'unknown');
        await this.telegramBotService.notifyPrinterStatus({
          printerName,
          printerModel,
          eventType: 'STARTED',
          isPreparing: newStatus === 'PREPARE',
          currentFile,
          remainingMinutes: telemetry.remainingMinutes,
          nozzleTemp: telemetry.nozzleTemp,
          bedTemp: telemetry.bedTemp,
          orderNumber,
          clientName,
        });
        return;
      }

      // If PREPARE -> RUNNING: check if already notified start for this file/session
      if (prevStatus === 'PREPARE' && newStatus === 'RUNNING') {
        const notifiedFor = this.lastNotifiedStart.get(printerId);
        if (!notifiedFor || (currentFile && notifiedFor !== currentFile)) {
          this.lastNotifiedStart.set(printerId, currentFile || 'unknown');
          await this.telegramBotService.notifyPrinterStatus({
            printerName,
            printerModel,
            eventType: 'STARTED',
            isPreparing: false,
            currentFile,
            remainingMinutes: telemetry.remainingMinutes,
            nozzleTemp: telemetry.nozzleTemp,
            bedTemp: telemetry.bedTemp,
            orderNumber,
            clientName,
          });
        }
        return;
      }

      // 2. PAUSED
      if (newStatus === 'PAUSED') {
        const errorMsg =
          telemetry.printError && telemetry.printError > 0
            ? this.telegramBotService.formatBambuError(telemetry.printError, telemetry.failReason)
            : undefined;

        await this.telegramBotService.notifyPrinterStatus({
          printerName,
          printerModel,
          eventType: 'PAUSED',
          currentFile,
          progress: telemetry.percent,
          remainingMinutes: telemetry.remainingMinutes,
          errorMessage: errorMsg,
          orderNumber,
          clientName,
        });
        return;
      }

      // 3. RESUMED
      if (prevStatus === 'PAUSED' && newStatus === 'RUNNING') {
        await this.telegramBotService.notifyPrinterStatus({
          printerName,
          printerModel,
          eventType: 'RESUMED',
          currentFile,
          progress: telemetry.percent,
          remainingMinutes: telemetry.remainingMinutes,
          orderNumber,
          clientName,
        });
        return;
      }

      // 4. FINISHED
      if (newStatus === 'FINISH') {
        this.lastNotifiedStart.delete(printerId);

        // Fetch fresh printer data for accurate totalWorkHours
        const dbPrinter = await this.prisma.printer.findUnique({
          where: { id: printerId },
          select: { initialWorkHours: true, trackedWorkMinutes: true },
        });

        const initialH = dbPrinter?.initialWorkHours || 0;
        const trackedM = dbPrinter?.trackedWorkMinutes || 0;
        const totalWorkHours = Number((initialH + trackedM / 60).toFixed(1));

        await this.telegramBotService.notifyPrinterStatus({
          printerName,
          printerModel,
          eventType: 'FINISHED',
          currentFile,
          totalWorkHours,
          orderNumber,
          clientName,
        });
        return;
      }

      // 5. FAILED / CANCELLED
      if (newStatus === 'FAILED') {
        this.lastNotifiedStart.delete(printerId);

        const isCancelled = telemetry.failReason === 1 || (!telemetry.printError && telemetry.failReason === 0);

        if (isCancelled) {
          await this.telegramBotService.notifyPrinterStatus({
            printerName,
            printerModel,
            eventType: 'CANCELLED',
            currentFile,
            progress: telemetry.percent,
            orderNumber,
            clientName,
          });
        } else {
          const errorMsg = this.telegramBotService.formatBambuError(telemetry.printError, telemetry.failReason);
          await this.telegramBotService.notifyPrinterStatus({
            printerName,
            printerModel,
            eventType: 'FAILED',
            currentFile,
            progress: telemetry.percent,
            errorCode: telemetry.printError,
            errorMessage: errorMsg,
            orderNumber,
            clientName,
          });
        }
        return;
      }

      // If IDLE, clear lastNotifiedStart
      if (newStatus === 'IDLE') {
        this.lastNotifiedStart.delete(printerId);
      }
    } catch (err: any) {
      this.logger.error(`Error handling status transition for printer ${printerId}:`, err?.message || err);
    }
  }

  async testConnection(ipAddress: string, accessCode: string, serialNumber?: string | null): Promise<{
    success: boolean;
    message: string;
    telemetry?: BambuTelemetry;
  }> {
    return new Promise((resolve) => {
      const cleanIp = ipAddress.replace(/^https?:\/\//i, '').replace(/:.*$/, '').trim();
      const cleanAccessCode = accessCode.trim();
      const cleanSerial = serialNumber?.trim().toUpperCase() || null;

      const client = mqtt.connect({
        host: cleanIp,
        port: 8883,
        family: 4,
        protocol: 'mqtts',
        protocolVersion: 4, // Bambu Lab strictly requires MQTT 3.1.1
        username: 'bblp',
        password: cleanAccessCode,
        rejectUnauthorized: false,
        checkServerIdentity: () => undefined,
        connectTimeout: 6000,
        clean: true,
        keepalive: 60,
        clientId: cleanSerial ? `bblp_${cleanSerial}` : `bblp_test_${Math.random().toString(16).slice(2, 8)}`,
        tls: {
          rejectUnauthorized: false,
          checkServerIdentity: () => undefined,
          family: 4,
        },
      });

      const timeout = setTimeout(() => {
        try {
          client.end(true);
        } catch {}
        resolve({
          success: false,
          message: `Connection timed out to ${cleanIp}:8883. Check LAN mode and IP address.`,
        });
      }, 6500);

      client.on('connect', () => {
        const topic = cleanSerial ? `device/${cleanSerial}/report` : 'device/+/report';
        client.subscribe(topic, () => {
          this.requestPushAll(client, cleanSerial);
        });

        // Wait a short moment to receive telemetry report
        client.once('message', (_topic, message) => {
          clearTimeout(timeout);
          try {
            const payload = JSON.parse(message.toString());
            const print = payload.print || {};
            const telemetry: BambuTelemetry = {
              gcodeState: print.gcode_state,
              percent: print.mc_percent !== undefined ? Number(print.mc_percent) : undefined,
              remainingMinutes: print.mc_remaining_time !== undefined ? Number(print.mc_remaining_time) : undefined,
              nozzleTemp: print.nozzle_temper !== undefined ? Number(print.nozzle_temper) : undefined,
              bedTemp: print.bed_temper !== undefined ? Number(print.bed_temper) : undefined,
              currentFile: print.subtask_name || print.gcode_file,
            };
            client.end(true);
            resolve({
              success: true,
              message: 'Successfully connected to Bambu Lab printer via local MQTT!',
              telemetry,
            });
          } catch (e) {
            client.end(true);
            resolve({
              success: true,
              message: 'Successfully connected to Bambu Lab printer via local MQTT!',
            });
          }
        });

        // If no message within 1.5s but connected, resolve success
        setTimeout(() => {
          clearTimeout(timeout);
          try {
            client.end(true);
          } catch {}
          resolve({
            success: true,
            message: 'Connected to Bambu Lab printer via local MQTT!',
          });
        }, 1500);
      });

      client.on('error', (err: any) => {
        clearTimeout(timeout);
        try {
          client.end(true);
        } catch {}

        let hint = err.message;
        if (err.message && err.message.toLowerCase().includes('not authorized')) {
          hint = 'Access Code is incorrect. Check the 8-character LAN Access Code on the printer screen.';
        } else if (err.code === 'EHOSTUNREACH') {
          hint = `Host ${ipAddress} is unreachable. Check if the printer is on the same Wi-Fi subnet.`;
        } else if (err.code === 'ECONNREFUSED') {
          hint = `Connection refused on port 8883. Ensure LAN Mode is enabled on the printer.`;
        } else if (err.code === 'ETIMEDOUT') {
          hint = `Connection timed out to ${cleanIp}. Check IP address.`;
        }

        resolve({
          success: false,
          message: `Connection failed: ${hint}`,
        });
      });
    });
  }
}
