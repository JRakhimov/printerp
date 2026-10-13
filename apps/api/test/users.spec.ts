import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { Role } from '@printerp/shared';
import { UsersService } from '../src/modules/users/users.service';
import { PrismaService } from '../src/database/prisma.service';

describe('UsersService', () => {
  let service: UsersService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const owner = {
    id: 'owner-1',
    telegramId: BigInt(111),
    telegramUsername: 'owner',
    firstName: 'Owner',
    lastName: null,
    role: Role.OWNER,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should return a JSON-safe user after deletion', async () => {
    const employee = { ...owner, id: 'user-2', role: Role.USER };

    mockPrismaService.user.findUnique.mockResolvedValue(employee);
    mockPrismaService.user.delete.mockResolvedValue(employee);

    const deleted = await service.deleteUser('user-2');

    expect(deleted.telegramId).toBe('111');
    expect(() => JSON.stringify(deleted)).not.toThrow();
  });

  it('should not delete the last active owner', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue(owner);
    mockPrismaService.user.count.mockResolvedValue(0);

    await expect(service.deleteUser('owner-1')).rejects.toThrow(BadRequestException);
    expect(mockPrismaService.user.delete).not.toHaveBeenCalled();
  });

  it('should not demote or deactivate the last active owner', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue(owner);
    mockPrismaService.user.count.mockResolvedValue(0);

    await expect(service.updateUser('owner-1', { role: Role.USER })).rejects.toThrow(BadRequestException);
    await expect(service.updateUser('owner-1', { isActive: false })).rejects.toThrow(BadRequestException);
    expect(mockPrismaService.user.update).not.toHaveBeenCalled();
  });

  it('should demote an owner when another active owner remains', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue(owner);
    mockPrismaService.user.count.mockResolvedValue(1);
    mockPrismaService.user.update.mockResolvedValue({ ...owner, role: Role.USER });

    const updated = await service.updateUser('owner-1', { role: Role.USER });

    expect(updated.role).toBe(Role.USER);
  });

  it('should rename the last owner without the owner check', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue(owner);
    mockPrismaService.user.update.mockResolvedValue({ ...owner, firstName: 'Boss' });

    await service.updateUser('owner-1', { firstName: 'Boss' });

    expect(mockPrismaService.user.count).not.toHaveBeenCalled();
  });
});
