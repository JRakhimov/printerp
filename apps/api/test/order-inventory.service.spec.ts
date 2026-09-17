import { OrderInventoryService } from '../src/modules/orders/order-inventory.service';

describe('OrderInventoryService', () => {
  const service = new OrderInventoryService();

  it('deducts custom filament quantities atomically', async () => {
    const tx: any = {
      project: { findMany: jest.fn() },
      filament: {
        findUnique: jest.fn().mockResolvedValue({ stockG: 500, spoolWeightG: 1000 }),
        update: jest.fn(),
      },
    };

    await service.deduct([
      { projectId: 'project-1', quantity: 2, filaments: [{ filamentId: 'filament-1', grams: 30 }] },
    ], tx);

    expect(tx.filament.update).toHaveBeenCalledWith({
      where: { id: 'filament-1' },
      data: { stockG: { decrement: 60 } },
    });
  });

  it('restores project filament quantities atomically', async () => {
    const tx: any = {
      project: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'project-1', projectFilaments: [{ filamentId: 'filament-1', grams: 25 }] },
        ]),
      },
      filament: {
        findUnique: jest.fn().mockResolvedValue({ stockG: 440, spoolWeightG: 1000 }),
        update: jest.fn(),
      },
    };

    await service.restore([{ projectId: 'project-1', quantity: 2 }], tx);

    expect(tx.filament.update).toHaveBeenCalledWith({
      where: { id: 'filament-1' },
      data: { stockG: { increment: 50 } },
    });
  });
});
