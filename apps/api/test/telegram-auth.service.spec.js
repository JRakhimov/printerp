"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const common_1 = require("@nestjs/common");
const crypto = require("crypto");
const telegram_auth_service_1 = require("../src/modules/auth/telegram-auth.service");
const prisma_service_1 = require("../src/database/prisma.service");
const shared_1 = require("@printerp/shared");
describe('TelegramAuthService', () => {
    let service;
    let prismaService;
    let jwtService;
    const BOT_TOKEN = '123456789:ABCdefGHIjklMNOpqrsTUVwxyZ';
    const ALLOWED_TELEGRAM_ID = 123456789;
    const DENIED_TELEGRAM_ID = 999999999;
    function createValidInitData(telegramId, username = 'testuser') {
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
        prismaService = {
            user: {
                findUnique: jest.fn(),
                update: jest.fn(),
            },
        };
        jwtService = {
            sign: jest.fn().mockReturnValue('mocked-jwt-token'),
        };
        const module = await testing_1.Test.createTestingModule({
            providers: [
                telegram_auth_service_1.TelegramAuthService,
                {
                    provide: config_1.ConfigService,
                    useValue: {
                        get: jest.fn((key) => {
                            if (key === 'TELEGRAM_BOT_TOKEN')
                                return BOT_TOKEN;
                            if (key === 'DEV_BYPASS_AUTH')
                                return 'false';
                            return null;
                        }),
                    },
                },
                {
                    provide: prisma_service_1.PrismaService,
                    useValue: prismaService,
                },
                {
                    provide: jwt_1.JwtService,
                    useValue: jwtService,
                },
            ],
        }).compile();
        service = module.get(telegram_auth_service_1.TelegramAuthService);
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
            expect(() => service.validateTelegramInitData(tamperedInitData)).toThrow(common_1.UnauthorizedException);
        });
        it('should throw UnauthorizedException if hash parameter is missing', () => {
            expect(() => service.validateTelegramInitData('auth_date=12345')).toThrow(common_1.UnauthorizedException);
        });
    });
    describe('authenticate', () => {
        it('should issue JWT token for user in allowlist', async () => {
            const validInitData = createValidInitData(ALLOWED_TELEGRAM_ID);
            prismaService.user.findUnique.mockResolvedValue({
                id: 'user-uuid-1',
                telegramId: BigInt(ALLOWED_TELEGRAM_ID),
                telegramUsername: 'testuser',
                firstName: 'Test',
                lastName: 'User',
                role: shared_1.Role.OWNER,
                isActive: true,
            });
            prismaService.user.update.mockResolvedValue({});
            const result = await service.authenticate(validInitData);
            expect(result.accessToken).toBe('mocked-jwt-token');
            expect(result.user.telegramId).toBe(ALLOWED_TELEGRAM_ID.toString());
            expect(result.user.role).toBe(shared_1.Role.OWNER);
        });
        it('should throw ForbiddenException if user is missing from allowlist', async () => {
            const validInitData = createValidInitData(DENIED_TELEGRAM_ID);
            prismaService.user.findUnique.mockResolvedValue(null);
            await expect(service.authenticate(validInitData)).rejects.toThrow(common_1.ForbiddenException);
        });
        it('should throw ForbiddenException if user in allowlist is inactive', async () => {
            const validInitData = createValidInitData(ALLOWED_TELEGRAM_ID);
            prismaService.user.findUnique.mockResolvedValue({
                id: 'user-uuid-1',
                telegramId: BigInt(ALLOWED_TELEGRAM_ID),
                role: shared_1.Role.USER,
                isActive: false,
            });
            await expect(service.authenticate(validInitData)).rejects.toThrow(common_1.ForbiddenException);
        });
    });
});
//# sourceMappingURL=telegram-auth.service.spec.js.map