import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';
import { CreateOrderDto, UpdateOrderDto, ChangeOrderStatusDto } from '@printerp/shared';
import { OrderStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramBotService: TelegramBotService,
  ) {}

  async create(userId: string, dto: CreateOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }

    // Check client exists
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, deletedAt: null },
    });
    if (!client) {
      throw new NotFoundException(`Client with ID "${dto.clientId}" not found`);
    }

    // Fetch referenced projects
    const projectIds = dto.items.map((i) => i.projectId);
    const projects = await this.prisma.project.findMany({
      where: { id: { in: projectIds }, deletedAt: null },
    });
    const projectMap = new Map(projects.map((p) => [p.id, p]));

    // Calculate totals and format item snapshots
    let calculatedCost = 0;
    let calculatedPrice = 0;

    const itemsData = dto.items.map((item) => {
      const project = projectMap.get(item.projectId);
      if (!project) {
        throw new NotFoundException(`Project with ID "${item.projectId}" not found`);
      }

      const unitCost = item.unitCost !== undefined ? item.unitCost : project.defaultCost;
      const unitPrice = item.unitPrice !== undefined ? item.unitPrice : project.defaultPrice;
      const totalCost = unitCost * item.quantity;
      const totalPrice = unitPrice * item.quantity;

      calculatedCost += totalCost;
      calculatedPrice += totalPrice;

      return {
        projectId: project.id,
        projectNameSnapshot: project.name,
        quantity: item.quantity,
        unitCost,
        unitPrice,
        totalCost,
        totalPrice,
      };
    });

    const finalPrice = dto.finalPrice !== undefined ? dto.finalPrice : calculatedPrice;

    // Determine payment status if initial payment is provided
    let paymentStatus: PaymentStatus = PaymentStatus.UNPAID;
    const initialPayment = dto.initialPaymentAmount || 0;
    if (initialPayment >= finalPrice && finalPrice > 0) {
      paymentStatus = PaymentStatus.PAID;
    } else if (initialPayment > 0) {
      paymentStatus = PaymentStatus.PARTIALLY_PAID;
    }

    const createdOrder = await this.prisma.order.create({
      data: {
        clientId: dto.clientId,
        createdById: userId,
        updatedById: userId,
        deadline: dto.deadline ? new Date(dto.deadline) : null,
        comment: dto.comment,
        status: OrderStatus.CREATED,
        calculatedCost,
        calculatedPrice,
        finalPrice,
        paymentStatus,
        items: {
          create: itemsData,
        },
        payments: initialPayment > 0 ? {
          create: [
            {
              amount: initialPayment,
              comment: dto.initialPaymentComment || 'Initial deposit payment',
              createdById: userId,
            },
          ],
        } : undefined,
        events: {
          create: [
            {
              eventType: 'STATUS_CHANGE',
              oldValue: undefined,
              newValue: OrderStatus.CREATED,
              userId: userId,
              metadata: { comment: 'Order created' },
            },
          ],
        },
      },
      include: {
        client: true,
        items: {
          include: {
            project: true,
          },
        },
        payments: true,
        events: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    // Notify all other team members via Telegram Bot (excluding creator)
    this.telegramBotService.notifyNewOrder(createdOrder, createdOrder.createdById || userId);

    return createdOrder;
  }

  async findAll(filters?: { status?: OrderStatus; search?: string }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { client: { name: { contains: filters.search, mode: 'insensitive' } } },
        { comment: { contains: filters.search, mode: 'insensitive' } },
        { items: { some: { projectNameSnapshot: { contains: filters.search, mode: 'insensitive' } } } },
      ];
    }

    return this.prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        client: true,
        items: {
          include: {
            project: true,
          },
        },
        payments: true,
        printJobs: {
          include: {
            printer: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findFirst({
      where: { id },
      include: {
        client: true,
        items: {
          include: {
            project: {
              include: {
                projectFilaments: {
                  include: { filament: true },
                },
              },
            },
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        events: {
          orderBy: { createdAt: 'desc' },
        },
        printJobs: {
          include: {
            printer: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    return order;
  }

  async updateStatus(id: string, userId: string, dto: ChangeOrderStatusDto) {
    const order = await this.findOne(id);
    if (order.status === dto.status) {
      return order;
    }

    return this.prisma.order.update({
      where: { id },
      data: {
        status: dto.status,
        updatedById: userId,
        events: {
          create: {
            eventType: 'STATUS_CHANGE',
            oldValue: order.status,
            newValue: dto.status,
            userId: userId,
            metadata: dto.comment ? { comment: dto.comment } : undefined,
          },
        },
      },
      include: {
        client: true,
        items: true,
        events: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async update(id: string, userId: string, dto: UpdateOrderDto) {
    const existingOrder = await this.findOne(id);

    let calculatedCost: number | undefined;
    let calculatedPrice: number | undefined;
    let itemsData: any[] | undefined;

    if (dto.items && dto.items.length > 0) {
      const projectIds = dto.items.map((i) => i.projectId);
      const projects = await this.prisma.project.findMany({
        where: { id: { in: projectIds }, deletedAt: null },
      });
      const projectMap = new Map(projects.map((p) => [p.id, p]));

      calculatedCost = 0;
      calculatedPrice = 0;

      itemsData = dto.items.map((item) => {
        const project = projectMap.get(item.projectId);
        if (!project) {
          throw new NotFoundException(`Project with ID "${item.projectId}" not found`);
        }

        const unitCost = item.unitCost !== undefined ? item.unitCost : project.defaultCost;
        const unitPrice = item.unitPrice !== undefined ? item.unitPrice : project.defaultPrice;
        const totalCost = unitCost * item.quantity;
        const totalPrice = unitPrice * item.quantity;

        calculatedCost! += totalCost;
        calculatedPrice! += totalPrice;

        return {
          projectId: project.id,
          projectNameSnapshot: project.name,
          quantity: item.quantity,
          unitCost,
          unitPrice,
          totalCost,
          totalPrice,
        };
      });

      // Delete existing order items before recreating new items
      await this.prisma.orderItem.deleteMany({
        where: { orderId: id },
      });
    }

    const resolvedFinalPrice = dto.finalPrice !== undefined
      ? dto.finalPrice
      : calculatedPrice !== undefined
        ? calculatedPrice
        : existingOrder.finalPrice;

    // Handle depositAmount update if passed
    let paymentStatus: PaymentStatus | undefined = dto.paymentStatus;
    if (dto.depositAmount !== undefined) {
      const newDeposit = dto.depositAmount;
      const currentPayments = existingOrder.payments || [];
      const currentTotalPaid = currentPayments.reduce((acc, p) => acc + p.amount, 0);

      if (newDeposit !== currentTotalPaid) {
        if (newDeposit === 0) {
          await this.prisma.payment.deleteMany({ where: { orderId: id } });
        } else if (currentPayments.length === 1) {
          await this.prisma.payment.update({
            where: { id: currentPayments[0].id },
            data: {
              amount: newDeposit,
              comment: dto.depositComment || currentPayments[0].comment || 'Deposit payment',
            },
          });
        } else {
          // Replace or consolidate existing payments into updated deposit
          await this.prisma.payment.deleteMany({ where: { orderId: id } });
          await this.prisma.payment.create({
            data: {
              orderId: id,
              amount: newDeposit,
              comment: dto.depositComment || 'Updated deposit payment',
              createdById: userId,
            },
          });
        }
      }

      if (newDeposit >= resolvedFinalPrice && resolvedFinalPrice > 0) {
        paymentStatus = PaymentStatus.PAID;
      } else if (newDeposit > 0) {
        paymentStatus = PaymentStatus.PARTIALLY_PAID;
      } else {
        paymentStatus = PaymentStatus.UNPAID;
      }
    }

    return this.prisma.order.update({
      where: { id },
      data: {
        clientId: dto.clientId,
        deadline: dto.deadline ? new Date(dto.deadline) : dto.deadline === null ? null : undefined,
        comment: dto.comment,
        calculatedCost: calculatedCost !== undefined ? calculatedCost : undefined,
        calculatedPrice: calculatedPrice !== undefined ? calculatedPrice : undefined,
        finalPrice: dto.finalPrice !== undefined ? dto.finalPrice : calculatedPrice !== undefined ? calculatedPrice : undefined,
        paymentStatus: paymentStatus !== undefined ? paymentStatus : undefined,
        updatedById: userId,
        items: itemsData ? {
          create: itemsData,
        } : undefined,
      },
      include: {
        client: true,
        items: {
          include: {
            project: true,
          },
        },
        payments: true,
        events: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.order.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED },
    });
  }
}
