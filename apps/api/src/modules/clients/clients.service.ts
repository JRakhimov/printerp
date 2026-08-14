import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateClientDto, UpdateClientDto, ClientQueryDto } from '@printerp/shared';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ClientQueryDto) {
    const { search, source } = query;

    return this.prisma.client.findMany({
      where: {
        deletedAt: null,
        ...(source ? { source } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { telegramUsername: { contains: search, mode: 'insensitive' } },
                { instagramUsername: { contains: search, mode: 'insensitive' } },
                { phone: { contains: search, mode: 'insensitive' } },
                { city: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        _count: {
          select: { orders: true },
        },
        orders: {
          select: {
            id: true,
            finalPrice: true,
            calculatedPrice: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, deletedAt: null },
      include: {
        orders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            calculatedPrice: true,
            finalPrice: true,
            paymentStatus: true,
            deadline: true,
            createdAt: true,
            items: {
              select: {
                id: true,
                projectNameSnapshot: true,
                quantity: true,
                totalPrice: true,
              },
            },
            payments: {
              select: {
                id: true,
                amount: true,
                createdAt: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!client) {
      throw new NotFoundException(`Client with ID ${id} not found`);
    }

    return client;
  }

  async create(dto: CreateClientDto) {
    return this.prisma.client.create({
      data: {
        name: dto.name,
        telegramUsername: dto.telegramUsername,
        instagramUsername: dto.instagramUsername,
        phone: dto.phone,
        city: dto.city,
        source: dto.source,
        notes: dto.notes,
      },
    });
  }

  async update(id: string, dto: UpdateClientDto) {
    await this.findOne(id);

    return this.prisma.client.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    // Soft delete so historical order logs are never broken
    return this.prisma.client.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
