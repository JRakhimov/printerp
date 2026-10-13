import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { TelegramAuthService } from '../src/modules/auth/telegram-auth.service';
import { PrismaService } from '../src/database/prisma.service';
import { Role } from '@printerp/shared';

describe('TelegramAuthService', () => {
  let service: TelegramAuthService;
  let prismaService: any;
  let jwtService: any;
  let configValues: Record<string, string>;

  const BOT_TOKEN = '123456789:ABCdefGHIjklMNOpqrsTUVwxyZ';
  const ALLOWED_TELEGRAM_ID = 123456789;
  const DENIED_TELEGRAM_ID = 999999999;

  function createValidInitData(telegramId: number, username: string = 'testuser'): string {
    const userPayload = JSON.stringify({
      id: telegramId,
      first_name: 'Test',
      last_name: 'User',
      username: username,
    });

    const params = new URLSearchParams();
    params.set('auth_date', Math.floor(Date.now() / 1000).toString());
    params.set('query_id', 'AAHdwa05AAAAAN3BrTl5d3sW');
    params.set('user', userPayload);

    const keys = Array.from(params.keys()).sort();
    const dataCheckString = keys.map((key) => `${key}=${params.get(key)}`).join('\n');

    const secretKey = crypto.createHmac('sha256', 'WebAppData').update(BOT_TOKEN).digest();
    const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    params.set('hash', hash);
    return params.toString();
  }

  beforeEach(async () => {
    configValues = {
      TELEGRAM_BOT_TOKEN: BOT_TOKEN,
      DEV_BYPASS_AUTH: 'false',
    };

    prismaService = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mocked-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramAuthService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => configValues[key] ?? null),
          },
        },
        {
          provide: PrismaService,
          useValue: prismaService,
        },
        {
          provide: JwtService,
          useValue: jwtService,
        },
      ],
    }).compile();

    service = module.get<TelegramAuthService>(TelegramAuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateTelegramInitData', () => {
    it('should successfully validate valid initData and extract user payload', () => {
      const validInitData = createValidInitData(ALLOWED_TELEGRAM_ID);
      const user = service.validateTelegramInitData(validInitData);

      expect(user).toBeDefined();
      expect(user.id).toBe(ALLOWED_TELEGRAM_ID);
      expect(user.username).toBe('testuser');
    });

    it('should throw UnauthorizedException if initData signature is invalid/tampered', () => {
      const validInitData = createValidInitData(ALLOWED_TELEGRAM_ID);
      const tamperedInitData = validInitData.replace('testuser', 'hackeruser');

      expect(() => service.validateTelegramInitData(tamperedInitData)).toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if hash parameter is missing', () => {
      expect(() => service.validateTelegramInitData('auth_date=12345')).toThrow(UnauthorizedException);
    });
  });

  describe('authenticate', () => {
    it('should issue JWT token for user in allowlist', async () => {
      const validInitData = createValidInitData(ALLOWED_TELEGRAM_ID);

      const mockUser = {
        id: 'user-uuid-1',
        telegramId: BigInt(ALLOWED_TELEGRAM_ID),
        telegramUsername: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: Role.OWNER,
        isActive: true,
      };

      prismaService.user.findUnique.mockResolvedValue(mockUser);
      prismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.authenticate(validInitData);

      expect(result.accessToken).toBe('mocked-jwt-token');
      expect(result.user.telegramId).toBe(ALLOWED_TELEGRAM_ID.toString());
      expect(result.user.role).toBe(Role.OWNER);
    });

    it('should throw ForbiddenException if user is missing from allowlist', async () => {
      const validInitData = createValidInitData(DENIED_TELEGRAM_ID);

      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.authenticate(validInitData)).rejects.toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException if user in allowlist is inactive', async () => {
      const validInitData = createValidInitData(ALLOWED_TELEGRAM_ID);

      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-uuid-1',
        telegramId: BigInt(ALLOWED_TELEGRAM_ID),
        role: Role.USER,
        isActive: false,
      });

      await expect(service.authenticate(validInitData)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('dev bypass', () => {
    it('should accept dev_user_ logins outside production when bypass is enabled', () => {
      configValues.DEV_BYPASS_AUTH = 'true';

      const result = service.validateTelegramInitData('dev_user_42');

      expect(result.id).toBe(42);
    });

    it('should reject dev_user_ logins in production even when bypass is enabled', () => {
      configValues.DEV_BYPASS_AUTH = 'true';
      configValues.NODE_ENV = 'production';

      expect(() => service.validateTelegramInitData('dev_user_42')).toThrow(UnauthorizedException);
    });

    it('should not log a real Telegram user in as another user when bypass is enabled', async () => {
      configValues.DEV_BYPASS_AUTH = 'true';
      const validInitData = createValidInitData(DENIED_TELEGRAM_ID);

      prismaService.user.findUnique.mockResolvedValue(null);
      prismaService.user.findFirst.mockResolvedValue({
        id: 'owner-uuid',
        telegramId: BigInt(ALLOWED_TELEGRAM_ID),
        role: Role.OWNER,
        isActive: true,
      });

      await expect(service.authenticate(validInitData)).rejects.toThrow(ForbiddenException);
      expect(prismaService.user.findFirst).not.toHaveBeenCalled();
    });
  });
});
