import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateFilamentDto, UpdateFilamentDto, FilamentQueryDto } from '@printerp/shared';
import { Prisma } from '@prisma/client';

@Injectable()
export class FilamentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper algorithm: calculate costPerGram = pricePerSpool / spoolWeightG
   */
  public calculateCostPerGram(pricePerSpool: number, spoolWeightG: number): Prisma.Decimal {
    if (!spoolWeightG || spoolWeightG <= 0) return new Prisma.Decimal(0);
    const rawCost = pricePerSpool / spoolWeightG;
    return new Prisma.Decimal(rawCost.toFixed(4));
  }

  async findAll(query: FilamentQueryDto) {
    const { search, material } = query;

    return this.prisma.filament.findMany({
      where: {
        deletedAt: null,
        ...(material ? { material } : {}),
        ...(search
          ? {
              OR: [
                { brand: { contains: search, mode: 'insensitive' } },
                { name: { contains: search, mode: 'insensitive' } },
                { color: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const filament = await this.prisma.filament.findFirst({
      where: { id, deletedAt: null },
    });

    if (!filament) {
      throw new NotFoundException(`Filament with ID ${id} not found`);
    }

    return filament;
  }

  async create(dto: CreateFilamentDto) {
    const costPerGram = this.calculateCostPerGram(dto.pricePerSpool, dto.spoolWeightG);

    return this.prisma.filament.create({
      data: {
        brand: dto.brand,
        name: dto.name,
        material: dto.material,
        color: dto.color,
        pricePerSpool: dto.pricePerSpool,
        spoolWeightG: dto.spoolWeightG,
        costPerGram,
        stockG: dto.stockG,
        notes: dto.notes,
      },
    });
  }

  async update(id: string, dto: UpdateFilamentDto) {
    const existing = await this.findOne(id);

    const pricePerSpool = dto.pricePerSpool !== undefined ? dto.pricePerSpool : existing.pricePerSpool;
    const spoolWeightG = dto.spoolWeightG !== undefined ? dto.spoolWeightG : existing.spoolWeightG;
    const costPerGram = this.calculateCostPerGram(pricePerSpool, spoolWeightG);

    return this.prisma.filament.update({
      where: { id },
      data: {
        ...dto,
        costPerGram,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.filament.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
