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
          }),
        }),
      );
      expect(result.id).toBe('tx-1');
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
    });
  });
});
