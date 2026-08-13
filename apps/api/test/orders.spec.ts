import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from '../src/modules/orders/orders.service';
import { PrismaService } from '../src/database/prisma.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';

describe('OrdersService', () => {
  let service: OrdersService;
  let prismaMock: any;

  beforeEach(async () => {
    prismaMock = {
      client: {
        findFirst: jest.fn(),
      },
      project: {
        findMany: jest.fn(),
      },
      order: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  describe('create order', () => {
    it('should calculate cost, price, profit and margin correctly', async () => {
      const clientId = 'client-uuid-1';
      const userId = 'user-uuid-1';

      prismaMock.client.findFirst.mockResolvedValue({ id: clientId, name: 'John Snow' });
      prismaMock.project.findMany.mockResolvedValue([
        {
          id: 'proj-1',
          name: 'Articulated Dragon',
          defaultCost: 50000,
          defaultPrice: 120000,
        },
        {
          id: 'proj-2',
          name: 'Headphone Stand',
          defaultCost: 30000,
          defaultPrice: 80000,
        },
      ]);

      prismaMock.order.create.mockImplementation(({ data }: any) => ({
        id: 'order-uuid-1',
        orderNumber: 1001,
        ...data,
      }));

      const dto = {
        clientId,
        items: [
          { projectId: 'proj-1', quantity: 2 }, // cost 100,000, price 240,000
          { projectId: 'proj-2', quantity: 1 }, // cost 30,000, price 80,000
        ],
        initialPaymentAmount: 150000,
      };

      const result: any = await service.create(userId, dto);

      expect(prismaMock.order.create).toHaveBeenCalled();
      expect(result.calculatedCost).toBe(130000); // 100,000 + 30,000
      expect(result.calculatedPrice).toBe(320000); // 240,000 + 80,000
      expect(result.finalPrice).toBe(320000);
      expect(result.paymentStatus).toBe(PaymentStatus.PARTIALLY_PAID);

      // Verify item snapshots
      expect(result.items.create).toHaveLength(2);
      expect(result.items.create[0]).toEqual({
        projectId: 'proj-1',
        projectNameSnapshot: 'Articulated Dragon',
        quantity: 2,
        unitCost: 50000,
        unitPrice: 120000,
        totalCost: 100000,
        totalPrice: 240000,
      });
    });
  });
});
