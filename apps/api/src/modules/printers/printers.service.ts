import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { BambuMqttService } from './bambu-mqtt.service';
import {
  CreatePrinterDto,
  UpdatePrinterDto,
  TestConnectionDto,
  CreatePrintJobDto,
  PrinterResponse,
  PrintJobStatus,
  OrderStatus,
} from '@printerp/shared';

@Injectable()
export class PrintersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bambuMqttService: BambuMqttService,
  ) {}

  async findAll(): Promise<PrinterResponse[]> {
    const printers = await this.prisma.printer.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        printJobs: {
          where: {
            status: { in: [PrintJobStatus.PRINTING, PrintJobStatus.QUEUED, PrintJobStatus.PAUSED] },
          },
          orderBy: { createdAt: 'asc' },
          include: {
            order: {
              select: {
                orderNumber: true,
              },
            },
          },
        },
      },
    });

    return printers.map((p) => {
      const activeJob = p.printJobs[0];
      return {
        id: p.id,
        name: p.name,
        manufacturer: p.manufacturer as unknown as PrinterResponse['manufacturer'],
        model: p.model,
        serialNumber: p.serialNumber,
        ipAddress: p.ipAddress,
        accessCode: p.accessCode,
        integrationType: p.integrationType as unknown as PrinterResponse['integrationType'],
        isActive: p.isActive,
        lastStatus: p.lastStatus,
        lastSeenAt: p.lastSeenAt ? p.lastSeenAt.toISOString() : null,
        nozzleTemp: p.nozzleTemp,
        bedTemp: p.bedTemp,
        printProgress: p.printProgress,
        remainingMinutes: p.remainingMinutes,
        currentFile: p.currentFile,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
        activeJob: activeJob
          ? {
              id: activeJob.id,
              orderId: activeJob.orderId,
              orderNumber: activeJob.order?.orderNumber,
              filename: activeJob.filename,
              status: activeJob.status as unknown as PrintJobStatus,
              startedAt: activeJob.startedAt ? activeJob.startedAt.toISOString() : null,
            }
          : null,
      };
    });
  }

  async findOne(id: string) {
    const printer = await this.prisma.printer.findUnique({
      where: { id },
      include: {
        printJobs: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          include: {
            order: {
              select: {
                orderNumber: true,
                client: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!printer) {
      throw new NotFoundException(`Printer with ID "${id}" not found`);
    }

    return printer;
  }

  async create(dto: CreatePrinterDto) {
    const printer = await this.prisma.printer.create({
      data: {
        name: dto.name,
        manufacturer: dto.manufacturer,
        model: dto.model,
        serialNumber: dto.serialNumber,
        ipAddress: dto.ipAddress,
        accessCode: dto.accessCode,
        integrationType: dto.integrationType,
        isActive: dto.isActive,
      },
    });

    if (printer.isActive && printer.ipAddress && printer.accessCode) {
      this.bambuMqttService.connectPrinter(printer);
    }

    return printer;
  }

  async update(id: string, dto: UpdatePrinterDto) {
    const existing = await this.prisma.printer.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Printer with ID "${id}" not found`);
    }

    const updated = await this.prisma.printer.update({
      where: { id },
      data: {
        name: dto.name,
        model: dto.model,
        serialNumber: dto.serialNumber,
        ipAddress: dto.ipAddress,
        accessCode: dto.accessCode,
        isActive: dto.isActive,
        lastStatus: dto.lastStatus,
      },
    });

    if (updated.isActive && updated.ipAddress && updated.accessCode) {
      this.bambuMqttService.connectPrinter(updated);
    } else {
      this.bambuMqttService.disconnectPrinter(id);
    }

    return updated;
  }

  async remove(id: string) {
    const existing = await this.prisma.printer.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Printer with ID "${id}" not found`);
    }

    this.bambuMqttService.disconnectPrinter(id);

    return this.prisma.printer.delete({
      where: { id },
    });
  }

  async testConnection(dto: TestConnectionDto) {
    return this.bambuMqttService.testConnection(
      dto.ipAddress,
      dto.accessCode,
      dto.serialNumber,
    );
  }

  async createPrintJob(printerId: string, dto: CreatePrintJobDto) {
    const printer = await this.prisma.printer.findUnique({ where: { id: printerId } });
    if (!printer) {
      throw new NotFoundException(`Printer with ID "${printerId}" not found`);
    }

    const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });
    if (!order) {
      throw new NotFoundException(`Order with ID "${dto.orderId}" not found`);
    }

    const job = await this.prisma.printJob.create({
      data: {
        printerId,
        orderId: dto.orderId,
        orderItemId: dto.orderItemId,
        filename: dto.filename,
        quantity: dto.quantity,
        estimatedTimeMinutes: dto.estimatedTimeMinutes,
        comment: dto.comment,
        status: PrintJobStatus.QUEUED,
      },
    });

    return job;
  }

  async updatePrintJobStatus(jobId: string, status: PrintJobStatus) {
    const job = await this.prisma.printJob.findUnique({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException(`Print job with ID "${jobId}" not found`);
    }

    const updateData: any = { status };
    if (status === PrintJobStatus.PRINTING && !job.startedAt) {
      updateData.startedAt = new Date();
    } else if (status === PrintJobStatus.FINISHED && !job.finishedAt) {
      updateData.finishedAt = new Date();
    }

    const updatedJob = await this.prisma.printJob.update({
      where: { id: jobId },
      data: updateData,
    });

    // Sync order status
    if (status === PrintJobStatus.PRINTING) {
      await this.prisma.order.update({
        where: { id: job.orderId },
        data: { status: OrderStatus.PRINTING },
      });
      await this.prisma.printer.update({
        where: { id: job.printerId },
        data: { lastStatus: 'RUNNING' },
      });
    } else if (status === PrintJobStatus.FINISHED) {
      const remainingUnfinished = await this.prisma.printJob.count({
        where: {
          orderId: job.orderId,
          status: { in: [PrintJobStatus.QUEUED, PrintJobStatus.PRINTING, PrintJobStatus.PAUSED] },
        },
      });
      if (remainingUnfinished === 0) {
        await this.prisma.order.update({
          where: { id: job.orderId },
          data: { status: OrderStatus.PRINTED },
        });
      }
      await this.prisma.printer.update({
        where: { id: job.printerId },
        data: { lastStatus: 'IDLE' },
      });
    }

    return updatedJob;
  }
}
