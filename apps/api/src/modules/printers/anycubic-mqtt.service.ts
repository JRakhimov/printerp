import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';
import {
  OrderStatus,
  PrintJobStatus,
  PrinterManufacturer,
} from '@printerp/shared';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const mqtt = require('mqtt');

type MqttClient = any;
type IClientOptions = any;

export interface AnycubicTelemetry {
  gcodeState?: string;
  percent?: number;
  remainingMinutes?: number;
  nozzleTemp?: number;
  bedTemp?: number;
  currentFile?: string;
}

export interface AnycubicCredentials {
  broker: string;
  username: string;
  password: string;
  deviceId: string;
  modelId: string;
  modelName: string;
  serialNumber: string | null;
  ctrlInfoUrl: string;
}

@Injectable()
export class AnycubicMqttService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnycubicMqttService.name);
  private clients = new Map<string, MqttClient>();
  private pollIntervals = new Map<string, NodeJS.Timeout>();
  private lastRunningTimestamps = new Map<string, number>();
  private pendingWorkMinutes = new Map<string, number>();
  private lastKnownStatus = new Map<string, string>();
  private printerInfo = new Map<string, { name: string; model: string }>();
  private lastNotifiedStart = new Map<string, string>();
  private printStartTimes = new Map<string, Date>();
  private cachedTelemetry = new Map<
    string,
    {
      currentFile?: string;
      remainingMinutes?: number;
      percent?: number;
      nozzleTemp?: number;
      bedTemp?: number;
    }
  >();

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramBotService: TelegramBotService,
  ) {}

  async onModuleInit() {
    await this.initAllPrinters();
  }

  async onModuleDestroy() {
    this.printStartTimes.clear();
    this.cachedTelemetry.clear();
    // Clear poll intervals
    for (const [printerId, interval] of this.pollIntervals.entries()) {
      clearInterval(interval);
    }
    this.pollIntervals.clear();

    // Disconnect clients
    for (const [printerId, client] of this.clients.entries()) {
      try {
        client.end(true);
        this.logger.log(`Disconnected Anycubic MQTT client for printer ${printerId}`);
      } catch (err) {
        this.logger.error(`Error disconnecting Anycubic printer ${printerId}`, err);
      }
    }
    this.clients.clear();
    this.lastKnownStatus.clear();
    this.printerInfo.clear();
    this.lastNotifiedStart.clear();

    // Save pending work minutes
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
          manufacturer: PrinterManufacturer.ANYCUBIC,
        },
      });

      for (const printer of printers) {
        this.printerInfo.set(printer.id, { name: printer.name, model: printer.model });
        if (printer.lastStatus) {
          this.lastKnownStatus.set(printer.id, printer.lastStatus);
        }
        await this.connectPrinter(printer);
      }
    } catch (err) {
      this.logger.error('Failed to initialize Anycubic printers from DB', err);
    }
  }

  /**
   * Perform signed HTTP handshake with Anycubic printer on port 18910
   */
  async doHandshake(ipAddress: string): Promise<AnycubicCredentials> {
    const cleanIp = ipAddress.replace(/^https?:\/\//i, '').replace(/:.*$/, '').trim();
    const infoUrl = `http://${cleanIp}:18910/info`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    let infoRes: Response;
    try {
      infoRes = await fetch(infoUrl, { signal: controller.signal });
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError') {
        throw new Error(`Connection timed out to http://${cleanIp}:18910/info. Check if printer IP is correct and LAN mode is enabled.`);
      }
      throw new Error(`Failed to reach Anycubic printer at http://${cleanIp}:18910: ${err.message}`);
    }
    clearTimeout(timeout);

    if (!infoRes.ok) {
      throw new Error(`Printer returned HTTP status ${infoRes.status} on /info`);
    }

    const infoData = await infoRes.json();
    const token = infoData.token;
    if (!token || typeof token !== 'string' || token.length < 32) {
      throw new Error('Invalid token received from Anycubic printer on /info');
    }

    const modelId = infoData.modelId?.toString() || '20030';
    const modelName = infoData.modelName || 'Anycubic Kobra X';
    const serialNumber = infoData.cn || null;
    const ctrlInfoUrl = infoData.ctrlInfoUrl || `http://${cleanIp}:18910/ctrl`;

    // Compute signature for /ctrl request
    // sign = md5(md5(token[0:16]) + ts + nonce)
    const first = crypto.createHash('md5').update(token.substring(0, 16)).digest('hex');
    const ts = Date.now().toString();
    const nonce = crypto.randomBytes(3).toString('hex');
    const did = crypto.randomBytes(16).toString('hex').toUpperCase();
    const sign = crypto.createHash('md5').update(first + ts + nonce).digest('hex');

    const postUrl = `${ctrlInfoUrl}?ts=${ts}&nonce=${nonce}&sign=${sign}&did=${did}`;
    const postController = new AbortController();
    const postTimeout = setTimeout(() => postController.abort(), 6000);

    let postRes: Response;
    try {
      postRes = await fetch(postUrl, {
        method: 'POST',
        signal: postController.signal,
      });
    } catch (err: any) {
      clearTimeout(postTimeout);
      throw new Error(`Failed to request /ctrl from Anycubic printer: ${err.message}`);
    }
    clearTimeout(postTimeout);

    if (!postRes.ok) {
      throw new Error(`Printer returned HTTP status ${postRes.status} on /ctrl`);
    }

    const ctrlJson = await postRes.json();
    if (ctrlJson.code !== 200 || !ctrlJson.data?.info) {
      throw new Error(`Handshake failed: ${ctrlJson.message || 'no info returned from /ctrl'}`);
    }

    const localToken = ctrlJson.data.token || '';
    const aesKey = Buffer.from(token.substring(16, 32), 'utf-8');
    let ivBuf = Buffer.from(localToken, 'utf-8');
    if (ivBuf.length < 16) {
      ivBuf = Buffer.concat([ivBuf, Buffer.alloc(16 - ivBuf.length, 0)]);
    } else if (ivBuf.length > 16) {
      ivBuf = ivBuf.subarray(0, 16);
    }

    const decipher = crypto.createDecipheriv('aes-128-cbc', aesKey, ivBuf);
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(ctrlJson.data.info, 'base64')),
      decipher.final(),
    ]).toString('utf-8');

    const decryptedInfo = JSON.parse(decrypted);

    return {
      broker: decryptedInfo.broker || `mqtts://${cleanIp}:9883`,
      username: decryptedInfo.username,
      password: decryptedInfo.password,
      deviceId: decryptedInfo.deviceId,
      modelId,
      modelName,
      serialNumber,
      ctrlInfoUrl,
    };
  }

  async connectPrinter(printer: {
    id: string;
    name: string;
    model?: string;
    ipAddress: string | null;
    serialNumber?: string | null;
  }) {
    if (!printer.ipAddress) return;

    this.printerInfo.set(printer.id, {
      name: printer.name,
      model: printer.model || this.printerInfo.get(printer.id)?.model || 'Anycubic Kobra X',
    });

    this.disconnectPrinter(printer.id);

    const cleanIp = printer.ipAddress.replace(/^https?:\/\//i, '').replace(/:.*$/, '').trim();

    try {
      this.logger.log(`Performing Anycubic LAN handshake with "${printer.name}" at ${cleanIp}...`);
      const creds = await this.doHandshake(cleanIp);

      this.logger.log(`Handshake successful for "${printer.name}". Model: ${creds.modelName} (${creds.modelId}), DeviceId: ${creds.deviceId}`);

      // Save serial number and model if not yet set
      if (!printer.serialNumber && creds.serialNumber) {
        this.prisma.printer.update({
          where: { id: printer.id },
          data: { serialNumber: creds.serialNumber },
        }).catch(() => {});
      }

      const options: IClientOptions = {
        host: cleanIp,
        port: 9883,
        family: 4,
        protocol: 'mqtts',
        protocolVersion: 4,
        username: creds.username,
        password: creds.password,
        rejectUnauthorized: false,
        checkServerIdentity: () => undefined,
        connectTimeout: 8000,
        reconnectPeriod: 15000,
        clean: true,
        keepalive: 60,
        clientId: `anycubic_${creds.deviceId.slice(0, 8)}_${Math.random().toString(16).slice(2, 6)}`,
        tls: {
          rejectUnauthorized: false,
          checkServerIdentity: () => undefined,
          family: 4,
        },
      };

      this.logger.log(`Connecting to Anycubic printer "${printer.name}" at ${cleanIp}:9883 via MQTTS...`);
      const client = mqtt.connect(options);
      this.clients.set(printer.id, client);

      const reportTopic = `anycubic/anycubicCloud/v1/printer/public/${creds.modelId}/${creds.deviceId}/+/report`;
      const queryTopic = `anycubic/anycubicCloud/v1/web/printer/${creds.modelId}/${creds.deviceId}/info`;

      client.on('connect', () => {
        this.logger.log(`✅ Connected to Anycubic printer "${printer.name}" via MQTT`);
        client.subscribe(reportTopic, (err: any) => {
          if (err) {
            this.logger.error(`Failed to subscribe to ${reportTopic} for "${printer.name}":`, err);
          } else {
            this.logger.log(`Subscribed to Anycubic reports: ${reportTopic}`);
            this.sendInfoQuery(client, queryTopic);
          }
        });

        // Set up periodic polling for info every 6 seconds
        const interval = setInterval(() => {
          this.sendInfoQuery(client, queryTopic);
        }, 6000);
        this.pollIntervals.set(printer.id, interval);
      });

      client.on('message', async (topic: string, message: Buffer) => {
        try {
          const payload = JSON.parse(message.toString());
          await this.handlePrinterReport(printer.id, topic, payload);
        } catch (err) {
          this.logger.warn(`Failed to parse MQTT message from Anycubic "${printer.name}": ${err}`);
        }
      });

      client.on('error', (err: any) => {
        this.logger.warn(`MQTT error on Anycubic "${printer.name}": ${err.message}`);
      });

      client.on('offline', () => {
        this.logger.log(`Anycubic printer "${printer.name}" went offline`);
      });
    } catch (err: any) {
      this.logger.error(`Error connecting to Anycubic printer "${printer.name}":`, err?.message || err);
    }
  }

  disconnectPrinter(printerId: string) {
    const interval = this.pollIntervals.get(printerId);
    if (interval) {
      clearInterval(interval);
      this.pollIntervals.delete(printerId);
    }

    const client = this.clients.get(printerId);
    if (client) {
      try {
        client.end(true);
      } catch (err) {
        this.logger.error(`Error closing MQTT client for Anycubic printer ${printerId}`, err);
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
    this.cachedTelemetry.delete(printerId);
  }

  private sendInfoQuery(client: MqttClient, queryTopic: string) {
    if (!client || !client.connected) return;
    const queryPayload = JSON.stringify({
      type: 'info',
      action: 'query',
      timestamp: Date.now(),
      msgid: Math.random().toString(16).slice(2, 10),
      data: null,
    });
    client.publish(queryTopic, queryPayload, { qos: 0 });
  }

  async handlePrinterReport(printerId: string, topic: string, payload: any) {
    const data = payload?.data;
    if (!data && payload?.state === undefined) return;

    // Determine report type from topic suffix (.../{type}/report)
    const topicParts = topic.split('/');
    const reportType = topicParts[topicParts.length - 2] || payload?.type || 'info';

    const updateData: any = {
      lastSeenAt: new Date(),
    };

    let parsedState: string | undefined;
    let percent: number | undefined;
    let remainingMinutes: number | undefined;
    let nozzleTemp: number | undefined;
    let bedTemp: number | undefined;
    let currentFile: string | undefined;

    if (reportType === 'info' && data) {
      const topState = data.state; // "free" | "busy"
      const project = data.project || data.last_project || {};
      const projectState = project.state; // (if present in some firmware)
      const printStatus = project.print_status !== undefined ? Number(project.print_status) : undefined;
      const prevStatus = this.lastKnownStatus.get(printerId);

      const isPaused = project.pause === 1 || projectState === 'paused' || projectState === 'pausing' || printStatus === 2;
      const isFinished = projectState === 'finished' || printStatus === 3 || (project.progress === 100 && topState === 'free');
      const isFailed = projectState === 'stoped' || projectState === 'stopping' || projectState === 'failed' || printStatus === 4 || printStatus === 5;

      if (isPaused) {
        parsedState = 'PAUSED';
      } else if (isFinished) {
        parsedState = 'FINISH';
      } else if (isFailed) {
        parsedState = 'FAILED';
      } else if (
        projectState === 'printing' ||
        projectState === 'preheating' ||
        projectState === 'auto_leveling' ||
        projectState === 'vibrating' ||
        projectState === 'flow_calibrating' ||
        projectState === 'resuming' ||
        topState === 'busy' ||
        printStatus === 1
      ) {
        parsedState = 'RUNNING';
      } else if (topState === 'free') {
        // If printer was previously RUNNING or PAUSED and now reports "free", print has finished!
        if (prevStatus === 'RUNNING' || prevStatus === 'PAUSED') {
          parsedState = 'FINISH';
        } else {
          parsedState = 'IDLE';
        }
      }

      if (project.progress !== undefined) {
        percent = Number(project.progress);
      }
      if (project.remain_time !== undefined) {
        remainingMinutes = Number(project.remain_time);
      }
      if (project.filename) {
        currentFile = project.filename;
      }

      const temp = data.temp || {};
      if (temp.curr_nozzle_temp !== undefined) {
        nozzleTemp = Number(temp.curr_nozzle_temp);
      }
      if (temp.curr_hotbed_temp !== undefined) {
        bedTemp = Number(temp.curr_hotbed_temp);
      }
    } else if (reportType === 'tempature' && data) {
      if (data.curr_nozzle_temp !== undefined) {
        nozzleTemp = Number(data.curr_nozzle_temp);
      }
      if (data.curr_hotbed_temp !== undefined) {
        bedTemp = Number(data.curr_hotbed_temp);
      }
    } else if (reportType === 'print' && data) {
      if (data.progress !== undefined) {
        percent = Number(data.progress);
      }
      if (data.remain_time !== undefined) {
        remainingMinutes = Number(data.remain_time);
      }
      if (data.filename) {
        currentFile = data.filename;
      }
      if (data.state === 'finished' || data.print_status === 3 || (percent === 100 && remainingMinutes === 0)) {
        parsedState = 'FINISH';
      }
    }

    const prevCached = this.cachedTelemetry.get(printerId) || {};
    const updatedCached = {
      ...prevCached,
      ...(currentFile !== undefined && { currentFile }),
      ...(remainingMinutes !== undefined && { remainingMinutes }),
      ...(percent !== undefined && { percent }),
      ...(nozzleTemp !== undefined && { nozzleTemp }),
      ...(bedTemp !== undefined && { bedTemp }),
    };
    this.cachedTelemetry.set(printerId, updatedCached);

    if (parsedState !== undefined) {
      updateData.lastStatus = parsedState;
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
    if (parsedState === 'RUNNING') {
      const now = Date.now();
      const lastTime = this.lastRunningTimestamps.get(printerId);
      let addedMinutes = 0;

      if (lastTime) {
        const diffMs = now - lastTime;
        if (diffMs >= 500 && diffMs <= 900_000) {
          addedMinutes = diffMs / 60_000;
        }
      }
      this.lastRunningTimestamps.set(printerId, now);

      if (addedMinutes > 0) {
        const currentPending = (this.pendingWorkMinutes.get(printerId) || 0) + addedMinutes;
        if (currentPending >= 0.5) {
          updateData.trackedWorkMinutes = { increment: Math.round(currentPending * 100) / 100 };
          this.pendingWorkMinutes.set(printerId, 0);
        } else {
          this.pendingWorkMinutes.set(printerId, currentPending);
        }
      }
    } else if (parsedState !== undefined) {
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

    // Auto sync with Order & PrintJob
    if (parsedState === 'RUNNING') {
      await this.handlePrintStarted(printerId, currentFile || updatedCached.currentFile);
    } else if (parsedState === 'FINISH') {
      await this.handlePrintFinished(printerId);
    }

    // Status transition notification
    if (parsedState !== undefined) {
      const prevStatus = this.lastKnownStatus.get(printerId);
      if (prevStatus === undefined) {
        this.lastKnownStatus.set(printerId, parsedState);
      } else if (prevStatus !== parsedState) {
        this.lastKnownStatus.set(printerId, parsedState);
        await this.handleStatusTransition(printerId, prevStatus, parsedState, {
          percent: percent ?? updatedCached.percent,
          remainingMinutes: remainingMinutes ?? updatedCached.remainingMinutes,
          nozzleTemp: nozzleTemp ?? updatedCached.nozzleTemp,
          bedTemp: bedTemp ?? updatedCached.bedTemp,
          currentFile: currentFile ?? updatedCached.currentFile,
        });
      }
    }
  }

  private async handlePrintStarted(printerId: string, filename?: string) {
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
    },
  ) {
    try {
      const pInfo = this.printerInfo.get(printerId) || { name: 'Anycubic Принтер', model: 'Anycubic Kobra X' };
      const printerName = pInfo.name;
      const printerModel = pInfo.model;

      const activeJob = await this.prisma.printJob.findFirst({
        where: { printerId },
        orderBy: { updatedAt: 'desc' },
        include: {
          order: {
            select: {
              orderNumber: true,
              client: { select: { name: true } },
            },
          },
        },
      });

      const orderNumber = activeJob?.order?.orderNumber;
      const clientName = activeJob?.order?.client?.name || undefined;
      const currentFile = telemetry.currentFile || activeJob?.filename || undefined;

      const estimatedRemaining =
        telemetry.remainingMinutes && telemetry.remainingMinutes > 0
          ? telemetry.remainingMinutes
          : activeJob?.estimatedTimeMinutes && activeJob.estimatedTimeMinutes > 0
            ? activeJob.estimatedTimeMinutes
            : undefined;

      if (newStatus === 'RUNNING' && prevStatus !== 'RUNNING') {
        if (!this.printStartTimes.has(printerId)) {
          this.printStartTimes.set(printerId, new Date());
        }
        const dedupeKey = `${currentFile || 'unknown'}_${orderNumber || '0'}`;
        if (this.lastNotifiedStart.get(printerId) === dedupeKey && prevStatus === 'PAUSED') {
          await this.telegramBotService.notifyPrinterStatus({
            printerName,
            printerModel,
            eventType: 'RESUMED',
            currentFile,
            progress: telemetry.percent,
            remainingMinutes: telemetry.remainingMinutes || estimatedRemaining,
            nozzleTemp: telemetry.nozzleTemp,
            bedTemp: telemetry.bedTemp,
            orderNumber,
            clientName,
          });
        } else {
          this.lastNotifiedStart.set(printerId, dedupeKey);
          await this.telegramBotService.notifyPrinterStatus({
            printerName,
            printerModel,
            eventType: 'STARTED',
            currentFile,
            progress: telemetry.percent,
            remainingMinutes: estimatedRemaining,
            nozzleTemp: telemetry.nozzleTemp,
            bedTemp: telemetry.bedTemp,
            orderNumber,
            clientName,
          });
        }
        return;
      }

      if (newStatus === 'PAUSED') {
        await this.telegramBotService.notifyPrinterStatus({
          printerName,
          printerModel,
          eventType: 'PAUSED',
          currentFile,
          progress: telemetry.percent,
          remainingMinutes: telemetry.remainingMinutes,
          nozzleTemp: telemetry.nozzleTemp,
          bedTemp: telemetry.bedTemp,
          orderNumber,
          clientName,
        });
        return;
      }

      if (newStatus === 'FINISH' || (prevStatus === 'RUNNING' && newStatus === 'IDLE')) {
        // Flush pending work minutes
        const pending = this.pendingWorkMinutes.get(printerId) || 0;
        if (pending > 0) {
          await this.prisma.printer.update({
            where: { id: printerId },
            data: { trackedWorkMinutes: { increment: Math.round(pending * 100) / 100 } },
          });
          this.pendingWorkMinutes.set(printerId, 0);
        }

        // Calculate duration of this print
        const startTime = this.printStartTimes.get(printerId) || activeJob?.startedAt;
        let printDurationMinutes: number | undefined;
        if (startTime) {
          printDurationMinutes = Math.round((Date.now() - new Date(startTime).getTime()) / 60_000);
          this.printStartTimes.delete(printerId);
        }

        const effectiveFile =
          currentFile ||
          telemetry.currentFile ||
          this.cachedTelemetry.get(printerId)?.currentFile ||
          activeJob?.filename ||
          undefined;

        const printer = await this.prisma.printer.findUnique({
          where: { id: printerId },
          select: { initialWorkHours: true, trackedWorkMinutes: true },
        });
        const totalHours = printer
          ? Number(((printer.initialWorkHours || 0) + ((printer.trackedWorkMinutes || 0) / 60)).toFixed(1))
          : undefined;

        await this.telegramBotService.notifyPrinterStatus({
          printerName,
          printerModel,
          eventType: 'FINISHED',
          currentFile: effectiveFile,
          progress: 100,
          remainingMinutes: 0,
          printDurationMinutes,
          totalWorkHours: totalHours,
          orderNumber,
          clientName,
        });

        this.lastNotifiedStart.delete(printerId);
        return;
      }

      if (newStatus === 'FAILED') {
        this.printStartTimes.delete(printerId);
        await this.telegramBotService.notifyPrinterStatus({
          printerName,
          printerModel,
          eventType: 'FAILED',
          currentFile,
          progress: telemetry.percent,
          errorMessage: 'Печать остановлена или сбой печати',
          orderNumber,
          clientName,
        });
        return;
      }

      if (newStatus === 'IDLE') {
        this.lastNotifiedStart.delete(printerId);
        this.printStartTimes.delete(printerId);
      }
    } catch (err: any) {
      this.logger.error(`Error handling status transition for Anycubic printer ${printerId}:`, err?.message || err);
    }
  }

  async testConnection(ipAddress: string): Promise<{
    success: boolean;
    message: string;
    telemetry?: AnycubicTelemetry;
  }> {
    const cleanIp = ipAddress.replace(/^https?:\/\//i, '').replace(/:.*$/, '').trim();

    let creds: AnycubicCredentials;
    try {
      creds = await this.doHandshake(cleanIp);
    } catch (err: any) {
      return {
        success: false,
        message: `Handshake failed: ${err.message}`,
      };
    }

    return new Promise((resolve) => {
      const client = mqtt.connect({
        host: cleanIp,
        port: 9883,
        family: 4,
        protocol: 'mqtts',
        protocolVersion: 4,
        username: creds.username,
        password: creds.password,
        rejectUnauthorized: false,
        checkServerIdentity: () => undefined,
        connectTimeout: 7000,
        clean: true,
        keepalive: 60,
        clientId: `anycubic_test_${Math.random().toString(16).slice(2, 8)}`,
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
          success: true,
          message: `Handshake successful (${creds.modelName}), but MQTT connection to ${cleanIp}:9883 timed out.`,
        });
      }, 7500);

      client.on('connect', () => {
        const reportTopic = `anycubic/anycubicCloud/v1/printer/public/${creds.modelId}/${creds.deviceId}/+/report`;
        const queryTopic = `anycubic/anycubicCloud/v1/web/printer/${creds.modelId}/${creds.deviceId}/info`;

        client.subscribe(reportTopic, () => {
          this.sendInfoQuery(client, queryTopic);
        });

        // Wait a short moment to receive telemetry report
        client.once('message', (_topic: string, message: Buffer) => {
          clearTimeout(timeout);
          try {
            const payload = JSON.parse(message.toString());
            const data = payload.data || {};
            const project = data.project || data.last_project || {};
            const temp = data.temp || {};

            const telemetry: AnycubicTelemetry = {
              gcodeState: data.state === 'busy' ? 'RUNNING' : 'IDLE',
              percent: project.progress !== undefined ? Number(project.progress) : undefined,
              remainingMinutes: project.remain_time !== undefined ? Number(project.remain_time) : undefined,
              nozzleTemp: temp.curr_nozzle_temp !== undefined ? Number(temp.curr_nozzle_temp) : undefined,
              bedTemp: temp.curr_hotbed_temp !== undefined ? Number(temp.curr_hotbed_temp) : undefined,
              currentFile: project.filename,
            };

            client.end(true);
            resolve({
              success: true,
              message: `Успешно подключено к Anycubic (${creds.modelName}) через локальный MQTT!`,
              telemetry,
            });
          } catch (e) {
            client.end(true);
            resolve({
              success: true,
              message: `Успешно подключено к Anycubic (${creds.modelName}) через локальный MQTT!`,
            });
          }
        });

        // If no message within 2s but connected, resolve success
        setTimeout(() => {
          clearTimeout(timeout);
          try {
            client.end(true);
          } catch {}
          resolve({
            success: true,
            message: `Успешно подключено к Anycubic (${creds.modelName}) через локальный MQTT!`,
          });
        }, 2000);
      });

      client.on('error', (err: any) => {
        clearTimeout(timeout);
        try {
          client.end(true);
        } catch {}

        let hint = err.message;
        if (err.code === 'EHOSTUNREACH') {
          hint = `Хост ${cleanIp} недоступен. Проверьте подсеть Wi-Fi.`;
        } else if (err.code === 'ECONNREFUSED') {
          hint = `Отказ в соединении на порту 9883. Проверьте LAN Mode в настройках принтера.`;
        } else if (err.code === 'ETIMEDOUT') {
          hint = `Таймаут подключения к ${cleanIp}:9883.`;
        }

        resolve({
          success: false,
          message: `Ошибка подключения к Anycubic MQTT: ${hint}`,
        });
      });
    });
  }
}
