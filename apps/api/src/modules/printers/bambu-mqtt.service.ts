import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
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

  constructor(private readonly prisma: PrismaService) {}

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
        this.connectPrinter(printer);
      }
    } catch (err) {
      this.logger.error('Failed to initialize Bambu Lab printers from DB', err);
    }
  }

  connectPrinter(printer: {
    id: string;
    name: string;
    ipAddress: string | null;
    accessCode: string | null;
    serialNumber: string | null;
  }) {
    if (!printer.ipAddress || !printer.accessCode) return;

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
