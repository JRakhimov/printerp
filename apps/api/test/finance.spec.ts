import { Test, TestingModule } from '@nestjs/testing';
import { FinanceService } from '../src/modules/finance/finance.service';
import { PrismaService } from '../src/database/prisma.service';
import { TransactionType, ExpenseCategory } from '@printerp/shared';

describe('FinanceService', () => {
  let service: FinanceService;

  const mockPrismaService = {
    transaction: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
    },
    filament: {
      findMany: jest.fn(),
    },
    orderItem: {
      groupBy: jest.fn(),
    },
    client: {
      findMany: jest.fn(),
    },
    project: {
      findMany: jest.fn(),
    },
    scrapRecord: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinanceService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<FinanceService>(FinanceService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTransaction', () => {
    it('should create an expense transaction', async () => {
      const dto = {
        type: TransactionType.EXPENSE,
        category: ExpenseCategory.ELECTRICITY,
        amount: 150000,
        comment: 'Monthly electricity bill',
      };

      mockPrismaService.transaction.create.mockResolvedValue({
        id: 'tx-1',
        ...dto,
        date: new Date(),
      });

      const result = await service.createTransaction(dto, 'user-1');

      expect(mockPrismaService.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: TransactionType.EXPENSE,
            amount: 150000,
            createdById: 'user-1',
          }),
        }),
      );
      expect(result.id).toBe('tx-1');
    });

    it('should extract string createdById if userId is passed as user object', async () => {
      const dto = {
        type: TransactionType.EXPENSE,
        category: ExpenseCategory.SOFT,
        amount: 80000,
        comment: 'CAD subscription',
      };

      mockPrismaService.transaction.create.mockResolvedValue({
        id: 'tx-2',
        ...dto,
        date: new Date(),
      });

      const userObject = { id: 'user-uuid-123', role: 'OWNER' };
      const result = await service.createTransaction(dto, userObject as any);

      expect(mockPrismaService.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            category: ExpenseCategory.SOFT,
            createdById: 'user-uuid-123',
          }),
        }),
      );
      expect(result.id).toBe('tx-2');
    });
  });

  describe('getSummary', () => {
    it('should calculate revenue, COGS, OpEx, netProfit and marginPercentage', async () => {
      mockPrismaService.order.findMany.mockResolvedValue([
        {
          calculatedCost: 50000,
          calculatedPrice: 120000,
          finalPrice: 120000,
          payments: [{ amount: 120000 }],
        },
        {
          calculatedCost: 30000,
          calculatedPrice: 80000,
          finalPrice: 80000,
          payments: [{ amount: 40000 }],
        },
      ]);

      mockPrismaService.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 50000 } }) // EXPENSE OpEx
        .mockResolvedValueOnce({ _sum: { amount: 0 } }); // INCOME extra

      mockPrismaService.filament.findMany.mockResolvedValue([
        { stockG: 1000, costPerGram: 250 },
      ]);

      mockPrismaService.project.findMany.mockResolvedValue([
        { defaultPrice: 50000, weightG: 50, projectFilaments: [] },
      ]);

      mockPrismaService.scrapRecord.aggregate.mockResolvedValue({
        _sum: { grams: 100, cost: 25000 },
        _count: { id: 2 },
      });

      const summary = await service.getSummary();

      expect(summary.revenue).toBe(200000); // 120000 + 80000
      expect(summary.cogs).toBe(80000); // 50000 + 30000
      expect(summary.opex).toBe(50000);
      expect(summary.netProfit).toBe(70000); // 200000 - 80000 - 50000
      expect(summary.marginPercentage).toBe(35); // Math.round((70000/200000)*100)
      expect(summary.unpaidBalance).toBe(40000); // 200000 - 160000 paid
      expect(summary.inventoryValuation).toBe(250000);
      expect(summary.filamentYield?.totalStockG).toBe(1000);
      expect(summary.filamentYield?.potentialRevenue).toBe(1000000); // 20 models * 50000
      expect(summary.scrapLoss?.totalScrapG).toBe(100);
      expect(summary.scrapLoss?.totalScrapCost).toBe(25000);
      expect(summary.scrapLoss?.incidentsCount).toBe(2);
      expect(summary.scrapLoss?.scrapRatePercentage).toBeDefined();
    });
  });

  describe('getTopScrapModels', () => {
    it('should return top defective models ranked by defects count', async () => {
      mockPrismaService.scrapRecord.findMany.mockResolvedValue([
        {
          orderItemId: 'item-1',
          grams: 60,
          cost: 15000,
          reason: 'LAYER_SHIFT',
          orderItem: { projectId: 'p-1', projectNameSnapshot: 'Dragon' },
        },
        {
          orderItemId: 'item-1',
          grams: 60,
          cost: 15000,
          reason: 'LAYER_SHIFT',
          orderItem: { projectId: 'p-1', projectNameSnapshot: 'Dragon' },
        },
        {
          orderItemId: 'item-2',
          grams: 30,
          cost: 8000,
          reason: 'BED_ADHESION',
          orderItem: { projectId: 'p-2', projectNameSnapshot: 'Vase' },
        },
      ]);

      const top = await service.getTopScrapModels();

      expect(top).toHaveLength(2);
      expect(top[0].name).toBe('Dragon');
      expect(top[0].defectsCount).toBe(2);
      expect(top[0].totalGrams).toBe(120);
      expect(top[0].totalCost).toBe(30000);
      expect(top[1].name).toBe('Vase');
      expect(top[1].defectsCount).toBe(1);
    });

    it('should return empty array if no scrap records exist', async () => {
      mockPrismaService.scrapRecord.findMany.mockResolvedValue([]);
      const top = await service.getTopScrapModels();
      expect(top).toEqual([]);
    });
  });
});
