import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { Role, CreateUserDto, UpdateUserDto } from '@printerp/shared';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.mapUser(user);
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
    });

    return users.map((u) => this.mapUser(u));
  }

  async createUser(dto: CreateUserDto) {
    const telegramIdBigInt = BigInt(dto.telegramId);

    const existing = await this.prisma.user.findUnique({
      where: { telegramId: telegramIdBigInt },
    });

    if (existing) {
      throw new ConflictException(`User with Telegram ID ${dto.telegramId} already exists in allowlist`);
    }

    const user = await this.prisma.user.create({
      data: {
        telegramId: telegramIdBigInt,
        telegramUsername: dto.telegramUsername || null,
        firstName: dto.firstName || null,
        lastName: dto.lastName || null,
        role: dto.role || Role.USER,
        isActive: true,
      },
    });

    return this.mapUser(user);
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const existing = await this.getUserById(id);
    const losesOwnerAccess = (dto.role !== undefined && dto.role !== Role.OWNER) || dto.isActive === false;

    if (losesOwnerAccess) {
      await this.assertNotLastActiveOwner(existing);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.firstName !== undefined ? { firstName: dto.firstName || null } : {}),
        ...(dto.lastName !== undefined ? { lastName: dto.lastName || null } : {}),
        ...(dto.telegramUsername !== undefined ? { telegramUsername: dto.telegramUsername || null } : {}),
        ...(dto.role ? { role: dto.role } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    return this.mapUser(updated);
  }

  async deleteUser(id: string) {
    const existing = await this.getUserById(id);

    await this.assertNotLastActiveOwner(existing);

    const deleted = await this.prisma.user.delete({
      where: { id },
    });

    return this.mapUser(deleted);
  }

  /**
   * Prevent the team from losing its only active owner (nobody could manage users afterwards).
   */
  private async assertNotLastActiveOwner(user: { id: string; role: Role; isActive: boolean }) {
    if (user.role !== Role.OWNER || !user.isActive) {
      return;
    }

    const otherActiveOwners = await this.prisma.user.count({
      where: {
        id: { not: user.id },
        role: Role.OWNER,
        isActive: true,
      },
    });

    if (otherActiveOwners === 0) {
      throw new BadRequestException('Cannot remove, deactivate or demote the last active owner');
    }
  }

  private mapUser(user: User) {
    return {
      id: user.id,
      telegramId: user.telegramId.toString(),
      telegramUsername: user.telegramUsername,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as Role,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
