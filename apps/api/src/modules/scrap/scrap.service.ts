import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateScrapRecordDto,
  ScrapQueryDto,
  ScrapSummaryResponse,
  ScrapReason,
  ScrapReasonLabels,
  PrintJobStatus,
} from '@printerp/shared';

@Injectable()
export class ScrapService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string | undefined, dto: CreateScrapRecordDto) {
    return this.prisma.$transaction(async (tx) => {
      const filament = await tx.filament.findUnique({
        where: { id: dto.filamentId },
      });

      if (!filament) {
        throw new NotFoundException(`Filament with ID "${dto.filamentId}" not found`);
      }

      const cost = Math.round(dto.grams * Number(filament.costPerGram));
      const reason = dto.reason || ScrapReason.OTHER;

      await this.deductStock(tx, filament, dto.grams);

      const scrapRecord = await tx.scrapRecord.create({
        data: {
          filamentId: dto.filamentId,
          grams: dto.grams,
          cost,
          reason,
          comment: dto.comment,
          orderId: dto.orderId || null,
          orderItemId: dto.orderItemId || null,
          printerId: dto.printerId || null,
          printJobId: dto.printJobId || null,
          createdById: userId || null,
        },
        include: {
          filament: true,
          order: { select: { id: true, orderNumber: true } },
          orderItem: { select: { id: true, projectNameSnapshot: true } },
          printer: { select: { id: true, name: true, model: true } },
        },
      });

      // If tied to an order, log order event and optionally create a reprint print job
      if (dto.orderId) {
        const reasonRu = ScrapReasonLabels[reason] || reason;

        await tx.orderEvent.create({
          data: {
            orderId: dto.orderId,
            userId: userId || null,
            eventType: 'SCRAP_RECORDED',
            metadata: {
              scrapRecordId: scrapRecord.id,
              grams: dto.grams,
              cost,
              reason,
              reasonRu,
              comment: dto.comment,
              filamentName: `${filament.brand} ${filament.name}`,
              itemName: scrapRecord.orderItem?.projectNameSnapshot,
            },
          },
        });

        if (dto.reprint) {
          const targetPrinterId = dto.reprintPrinterId || dto.printerId;

          if (targetPrinterId) {
            await tx.printJob.create({
              data: {
                printerId: targetPrinterId,
                orderId: dto.orderId,
                orderItemId: dto.orderItemId || null,
                filename: scrapRecord.orderItem?.projectNameSnapshot || 'Перепечатка',
                quantity: 1,
                status: PrintJobStatus.QUEUED,
                comment: `Перепечатка брака (${reasonRu})${dto.comment ? ': ' + dto.comment : ''}`,
              },
            });
          }
        }
      }

      return scrapRecord;
    });
  }

  /**
   * Same rules as order inventory: unknown stock starts from a full spool,
   * known stock is changed atomically and may go negative to expose bad data.
   */
  private async deductStock(
    tx: Prisma.TransactionClient,
    filament: { id: string; stockG: number | null; spoolWeightG: number },
    grams: number,
  ) {
    const stockG = filament.stockG === null
      ? filament.spoolWeightG - grams
      : { decrement: grams };

    await tx.filament.update({
      where: { id: filament.id },
      data: { stockG },
    });
  }

  async findAll(query: ScrapQueryDto) {
    const where: Prisma.ScrapRecordWhereInput = {};

    if (query.filamentId) {
      where.filamentId = query.filamentId;
    }

    if (query.orderId) {
      where.orderId = query.orderId;
    }

    if (query.printerId) {
      where.printerId = query.printerId;
    }

    if (query.reason) {
      where.reason = query.reason;
    }

    return this.prisma.scrapRecord.findMany({
      where,
      include: {
        filament: true,
        order: { select: { id: true, orderNumber: true } },
        orderItem: { select: { id: true, projectNameSnapshot: true } },
        printer: { select: { id: true, name: true, model: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getSummary(): Promise<ScrapSummaryResponse> {
    const totalAggregate = await this.prisma.scrapRecord.aggregate({
      _sum: { grams: true, cost: true },
      _count: { id: true },
    });

    const totalGrams = totalAggregate._sum.grams || 0;
    const totalCost = totalAggregate._sum.cost || 0;
    const incidentsCount = totalAggregate._count.id || 0;

    const records = await this.prisma.scrapRecord.findMany({
      select: { reason: true, grams: true, cost: true },
    });

    const byReason: Record<string, { grams: number; cost: number; count: number }> = {};
    for (const r of records) {
      if (!byReason[r.reason]) {
        byReason[r.reason] = { grams: 0, cost: 0, count: 0 };
      }
      byReason[r.reason].grams += r.grams;
      byReason[r.reason].cost += r.cost;
      byReason[r.reason].count += 1;
    }

    return {
      totalGrams,
      totalCost,
      incidentsCount,
      byReason,
    };
  }

  async remove(id: string) {
    return this.prisma.$transaction(async (tx) => {
      const record = await tx.scrapRecord.findUnique({
        where: { id },
      });

      if (!record) {
        throw new NotFoundException(`Scrap record with ID "${id}" not found`);
      }

      const filament = await tx.filament.findUnique({
        where: { id: record.filamentId },
      });

      if (filament && filament.stockG !== null) {
        await tx.filament.update({
          where: { id: filament.id },
          data: { stockG: { increment: record.grams } },
        });
      }

      return tx.scrapRecord.delete({
        where: { id },
      });
    });
  }
}
