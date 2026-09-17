import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

type InventoryItem = {
  projectId?: string | null;
  quantity: number;
  filaments?: { filamentId: string; grams: number }[];
  metadata?: unknown;
};

@Injectable()
export class OrderInventoryService {
  private async calculateUsage(
    items: InventoryItem[],
    tx: Prisma.TransactionClient,
  ): Promise<Map<string, number>> {
    const usage = new Map<string, number>();
    const projectIds = items
      .filter((item) => !this.getCustomFilaments(item)?.length && item.projectId)
      .map((item) => item.projectId as string);

    const projects = projectIds.length
      ? await tx.project.findMany({
          where: { id: { in: [...new Set(projectIds)] } },
          include: { projectFilaments: true },
        })
      : [];
    const projectMap = new Map(projects.map((project) => [project.id, project]));

    for (const item of items) {
      const quantity = Number(item.quantity) || 1;
      const filaments = this.getCustomFilaments(item)
        ?? (item.projectId ? projectMap.get(item.projectId)?.projectFilaments : undefined)
        ?? [];

      for (const filament of filaments) {
        if (!filament.filamentId || !filament.grams) continue;
        usage.set(
          filament.filamentId,
          (usage.get(filament.filamentId) || 0) + Number(filament.grams) * quantity,
        );
      }
    }

    return usage;
  }

  async deduct(items: InventoryItem[], tx: Prisma.TransactionClient) {
    await this.applyDelta(items, tx, -1);
  }

  async restore(items: InventoryItem[], tx: Prisma.TransactionClient) {
    await this.applyDelta(items, tx, 1);
  }

  private async applyDelta(
    items: InventoryItem[],
    tx: Prisma.TransactionClient,
    direction: -1 | 1,
  ) {
    const usage = await this.calculateUsage(items, tx);
    for (const [filamentId, grams] of usage) {
      const filament = await tx.filament.findUnique({ where: { id: filamentId } });
      if (!filament) continue;

      const fallbackStock = filament.spoolWeightG ?? 1000;
      const stockG = filament.stockG === null
        ? fallbackStock + direction * grams
        : direction === 1
          ? { increment: grams }
          : { decrement: grams };

      await tx.filament.update({ where: { id: filamentId }, data: { stockG } });
    }
  }

  private getCustomFilaments(item: InventoryItem) {
    if (item.filaments) return item.filaments;
    if (
      item.metadata
      && typeof item.metadata === 'object'
      && 'filaments' in item.metadata
      && Array.isArray(item.metadata.filaments)
    ) {
      return item.metadata.filaments as { filamentId: string; grams: number }[];
    }
    return undefined;
  }
}
