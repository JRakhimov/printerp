import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  CreateTransactionDto,
  TransactionQueryDto,
  FinancialSummary,
  MonthlyAnalytics,
  TopModelMetric,
  TopClientMetric,
} from '@printerp/shared';

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async createTransaction(dto: CreateTransactionDto, userId?: string) {
    return this.prisma.transaction.create({
      data: {
        type: dto.type,
        category: dto.category,
        amount: dto.amount,
        orderId: dto.orderId || null,
        date: dto.date ? new Date(dto.date) : new Date(),
        comment: dto.comment || null,
        createdById: userId || null,
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async findAllTransactions(query: TransactionQueryDto) {
    const { type, category, startDate, endDate, search } = query;

    const where: any = {};

    if (type) where.type = type;
    if (category) where.category = category;

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    if (search) {
      where.comment = { contains: search, mode: 'insensitive' };
    }

    return this.prisma.transaction.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async deleteTransaction(id: string) {
    const tx = await this.prisma.transaction.findUnique({ where: { id } });
    if (!tx) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return this.prisma.transaction.delete({ where: { id } });
  }

  async getSummary(): Promise<FinancialSummary> {
    // 1. Orders financial aggregation (excluding CANCELLED orders)
    const activeOrders = await this.prisma.order.findMany({
      where: { status: { not: 'CANCELLED' } },
      select: {
        calculatedCost: true,
        finalPrice: true,
        calculatedPrice: true,
        payments: {
          select: { amount: true },
        },
      },
    });

    let totalRevenue = 0;
    let totalCogs = 0;
    let totalPaymentsReceived = 0;

    for (const ord of activeOrders) {
      const price = ord.finalPrice > 0 ? ord.finalPrice : ord.calculatedPrice;
      totalRevenue += price;
      totalCogs += ord.calculatedCost;

      const orderPaid = ord.payments.reduce((sum, p) => sum + p.amount, 0);
      totalPaymentsReceived += orderPaid;
    }

    const unpaidBalance = Math.max(0, totalRevenue - totalPaymentsReceived);

    // 2. Operational expenses from transactions (type = EXPENSE)
    const expenseAggregate = await this.prisma.transaction.aggregate({
      where: { type: 'EXPENSE' },
      _sum: { amount: true },
    });

    const totalOpex = expenseAggregate._sum.amount || 0;

    // Additional income transactions (type = INCOME)
    const incomeAggregate = await this.prisma.transaction.aggregate({
      where: { type: 'INCOME' },
      _sum: { amount: true },
    });
    const extraIncome = incomeAggregate._sum.amount || 0;

    const netRevenue = totalRevenue + extraIncome;
    const netProfit = netRevenue - totalCogs - totalOpex;
    const marginPercentage = netRevenue > 0 ? Math.round((netProfit / netRevenue) * 100) : 0;

    // 3. Filament Inventory Valuation
    const filaments = await this.prisma.filament.findMany({
      where: { deletedAt: null },
      select: { stockG: true, costPerGram: true },
    });

    let inventoryValuation = 0;
    for (const fil of filaments) {
      if (fil.stockG && fil.stockG > 0) {
        inventoryValuation += Math.round(fil.stockG * Number(fil.costPerGram));
      }
    }

    return {
      revenue: netRevenue,
      cogs: totalCogs,
      opex: totalOpex,
      netProfit,
      marginPercentage,
      unpaidBalance,
      inventoryValuation,
    };
  }

  async getMonthlyAnalytics(): Promise<MonthlyAnalytics[]> {
    // Generate monthly metrics for past 6 months
    const result: MonthlyAnalytics[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
      const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

      const monthStr = date.toISOString().slice(0, 7); // YYYY-MM

      // Orders created this month
      const monthOrders = await this.prisma.order.findMany({
        where: {
          createdAt: { gte: startOfMonth, lte: endOfMonth },
          status: { not: 'CANCELLED' },
        },
        select: {
          calculatedCost: true,
          finalPrice: true,
          calculatedPrice: true,
        },
      });

      let revenue = 0;
      let cogs = 0;

      for (const ord of monthOrders) {
        revenue += ord.finalPrice > 0 ? ord.finalPrice : ord.calculatedPrice;
        cogs += ord.calculatedCost;
      }

      // Expenses recorded this month
      const monthExpenses = await this.prisma.transaction.aggregate({
        where: {
          date: { gte: startOfMonth, lte: endOfMonth },
          type: 'EXPENSE',
        },
        _sum: { amount: true },
      });

      const opex = monthExpenses._sum.amount || 0;
      const netProfit = revenue - cogs - opex;

      result.push({
        month: monthStr,
        revenue,
        cogs,
        opex,
        netProfit,
      });
    }

    return result;
  }

  async getTopModels(): Promise<TopModelMetric[]> {
    const items = await this.prisma.orderItem.groupBy({
      by: ['projectId', 'projectNameSnapshot'],
      where: {
        order: { status: { not: 'CANCELLED' } },
      },
      _sum: {
        quantity: true,
        totalPrice: true,
        totalCost: true,
      },
      orderBy: {
        _sum: { totalPrice: 'desc' },
      },
      take: 5,
    });

    return items.map((it) => {
      const quantity = it._sum.quantity || 0;
      const revenue = it._sum.totalPrice || 0;
      const cost = it._sum.totalCost || 0;
      const netProfit = revenue - cost;

      return {
        id: it.projectId || it.projectNameSnapshot,
        name: it.projectNameSnapshot,
        totalQuantity: quantity,
        totalRevenue: revenue,
        totalCost: cost,
        netProfit,
      };
    });
  }

  async getTopClients(): Promise<TopClientMetric[]> {
    const clients = await this.prisma.client.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        telegramUsername: true,
        orders: {
          where: { status: { not: 'CANCELLED' } },
          select: {
            finalPrice: true,
            calculatedPrice: true,
          },
        },
      },
    });

    const metrics = clients.map((c) => {
      const totalOrders = c.orders.length;
      const totalSpent = c.orders.reduce(
        (sum, o) => sum + (o.finalPrice > 0 ? o.finalPrice : o.calculatedPrice),
        0,
      );

      return {
        id: c.id,
        name: c.name,
        telegramUsername: c.telegramUsername,
        totalOrders,
        totalSpent,
      };
    });

    return metrics.sort((a, b) => b.totalSpent - a.totalSpent).slice(0, 5);
  }
}
