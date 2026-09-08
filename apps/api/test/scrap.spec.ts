import { Test, TestingModule } from '@nestjs/testing';
import { ScrapService } from '../src/modules/scrap/scrap.service';
import { PrismaService } from '../src/database/prisma.service';
import { ScrapReason, PrintJobStatus } from '@printerp/shared';
import { NotFoundException } from '@nestjs/common';

describe('ScrapService', () => {
  let scrapService: ScrapService;

  const mockPrismaService = {
    filament: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    scrapRecord: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      aggregate: jest.fn(),
      delete: jest.fn(),
    },
    orderEvent: {
      create: jest.fn(),
    },
    printJob: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScrapService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    scrapService = module.get<ScrapService>(ScrapService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(scrapService).toBeDefined();
  });

  describe('create', () => {
    it('should throw NotFoundException if filament not found', async () => {
      mockPrismaService.filament.findUnique.mockResolvedValue(null);

      await expect(
        scrapService.create('user-1', {
          filamentId: 'fil-999',
          grams: 50,
          reason: ScrapReason.LAYER_SHIFT,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should deduct filament stock and create scrap record', async () => {
      mockPrismaService.filament.findUnique.mockResolvedValue({
        id: 'fil-1',
        brand: 'eSUN',
        name: 'PLA+ Grey',
        stockG: 1000,
        costPerGram: 250,
      });

      mockPrismaService.filament.update.mockResolvedValue({
        id: 'fil-1',
        stockG: 950,
      });

      mockPrismaService.scrapRecord.create.mockResolvedValue({
        id: 'scrap-1',
        filamentId: 'fil-1',
        grams: 50,
        cost: 12500, // 50 * 250
        reason: ScrapReason.BED_ADHESION,
      });

      const result = await scrapService.create('user-1', {
        filamentId: 'fil-1',
        grams: 50,
        reason: ScrapReason.BED_ADHESION,
      });

      expect(mockPrismaService.filament.update).toHaveBeenCalledWith({
        where: { id: 'fil-1' },
        data: { stockG: 950 },
      });
      expect(mockPrismaService.scrapRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            filamentId: 'fil-1',
            grams: 50,
            cost: 12500,
            reason: ScrapReason.BED_ADHESION,
          }),
        }),
      );
      expect(result.id).toBe('scrap-1');
    });

    it('should create order event and reprint print job when tied to order with reprint flag', async () => {
      mockPrismaService.filament.findUnique.mockResolvedValue({
        id: 'fil-1',
        brand: 'eSUN',
        name: 'PLA+ Grey',
        stockG: 500,
        costPerGram: 200,
      });
      mockPrismaService.filament.update.mockResolvedValue({});

      mockPrismaService.scrapRecord.create.mockResolvedValue({
        id: 'scrap-2',
        filamentId: 'fil-1',
        grams: 100,
        cost: 20000,
        reason: ScrapReason.LAYER_SHIFT,
        orderId: 'order-1',
        orderItem: { projectNameSnapshot: 'Dragon Toy' },
      });

      mockPrismaService.orderEvent.create.mockResolvedValue({});
      mockPrismaService.printJob.create.mockResolvedValue({
        id: 'job-reprint',
        status: PrintJobStatus.QUEUED,
      });

      await scrapService.create('user-1', {
        filamentId: 'fil-1',
        grams: 100,
        reason: ScrapReason.LAYER_SHIFT,
        orderId: 'order-1',
        orderItemId: 'item-1',
        reprint: true,
        reprintPrinterId: 'printer-1',
      });

      // Verify order event
      expect(mockPrismaService.orderEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: 'order-1',
            eventType: 'SCRAP_RECORDED',
          }),
        }),
      );

      // Verify reprint print job creation
      expect(mockPrismaService.printJob.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            printerId: 'printer-1',
            orderId: 'order-1',
            orderItemId: 'item-1',
            status: PrintJobStatus.QUEUED,
          }),
        }),
      );
    });
  });

  describe('getSummary', () => {
    it('should return aggregated scrap statistics', async () => {
      mockPrismaService.scrapRecord.aggregate.mockResolvedValue({
        _sum: { grams: 250, cost: 50000 },
        _count: { id: 3 },
      });

      mockPrismaService.scrapRecord.findMany.mockResolvedValue([
        { reason: ScrapReason.BED_ADHESION, grams: 100, cost: 20000 },
        { reason: ScrapReason.BED_ADHESION, grams: 50, cost: 10000 },
        { reason: ScrapReason.PURGE_WASTE, grams: 100, cost: 20000 },
      ]);

      const summary = await scrapService.getSummary();

      expect(summary.totalGrams).toBe(250);
      expect(summary.totalCost).toBe(50000);
      expect(summary.incidentsCount).toBe(3);
      expect(summary.byReason[ScrapReason.BED_ADHESION]).toEqual({
        grams: 150,
        cost: 30000,
        count: 2,
      });
      expect(summary.byReason[ScrapReason.PURGE_WASTE]).toEqual({
        grams: 100,
        cost: 20000,
        count: 1,
      });
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException if scrap record not found', async () => {
      mockPrismaService.scrapRecord.findUnique.mockResolvedValue(null);

      await expect(scrapService.remove('scrap-999')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should restore grams back to filament and delete scrap record', async () => {
      mockPrismaService.scrapRecord.findUnique.mockResolvedValue({
        id: 'scrap-1',
        filamentId: 'fil-1',
        grams: 80,
      });

      mockPrismaService.filament.findUnique.mockResolvedValue({
        id: 'fil-1',
        stockG: 200,
      });

      mockPrismaService.filament.update.mockResolvedValue({});
      mockPrismaService.scrapRecord.delete.mockResolvedValue({ id: 'scrap-1' });

      await scrapService.remove('scrap-1');

      expect(mockPrismaService.filament.update).toHaveBeenCalledWith({
        where: { id: 'fil-1' },
        data: { stockG: 280 }, // 200 + 80
      });
      expect(mockPrismaService.scrapRecord.delete).toHaveBeenCalledWith({
        where: { id: 'scrap-1' },
      });
    });
  });
});
