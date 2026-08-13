import { Injectable, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { AuthResponse, Role } from '@printerp/shared';

export interface TelegramUserData {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

@Injectable()
export class TelegramAuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Validate Telegram initData string using HMAC-SHA256 algorithm.
   */
  public validateTelegramInitData(initData: string): TelegramUserData {
    const botToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN') || '';
    const devBypassEnv = this.configService.get<string>('DEV_BYPASS_AUTH');
    const isPlaceholderToken = !botToken || botToken.includes('ABCdefGHIjklMNOpqrsTUVwxyZ');
    const devBypass = devBypassEnv === 'true' || (devBypassEnv !== 'false' && isPlaceholderToken);

    // Dev mode mock / bypass test handler
    if (devBypass && initData.startsWith('dev_user_')) {
      const defaultOwnerId = parseInt(this.configService.get<string>('INITIAL_OWNER_TELEGRAM_ID') || '123456789', 10);
      const parsedId = parseInt(initData.replace('dev_user_', ''), 10);
      const devTelegramId = isNaN(parsedId) ? defaultOwnerId : parsedId;
      return {
        id: devTelegramId,
        first_name: 'Owner',
        last_name: 'Admin',
        username: 'homelab_owner',
      };
    }

    if (!botToken) {
      throw new UnauthorizedException('TELEGRAM_BOT_TOKEN is not configured');
    }

    try {
      const urlParams = new URLSearchParams(initData);
      const hash = urlParams.get('hash');
      if (!hash) {
        throw new UnauthorizedException('Invalid initData: missing hash');
      }

      urlParams.delete('hash');

      // Sort keys alphabetically
      const keys = Array.from(urlParams.keys()).sort();
      const dataCheckString = keys.map((key) => `${key}=${urlParams.get(key)}`).join('\n');

      // Official Telegram algorithm:
      // secret_key = HMAC_SHA256("WebAppData", bot_token)
      const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(botToken)
        .digest();

      // calculated_hash = HMAC_SHA256(data_check_string, secret_key)
      const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      const hashBuffer = Buffer.from(hash, 'hex');
      const calculatedBuffer = Buffer.from(calculatedHash, 'hex');

      if (
        hashBuffer.length !== calculatedBuffer.length ||
        !crypto.timingSafeEqual(hashBuffer, calculatedBuffer)
      ) {
        throw new UnauthorizedException('Invalid initData signature');
      }

      // Check auth_date freshness (e.g. max 24 hours old)
      const authDate = parseInt(urlParams.get('auth_date') || '0', 10);
      const now = Math.floor(Date.now() / 1000);
      if (authDate > 0 && now - authDate > 86400) {
        throw new UnauthorizedException('initData signature expired');
      }

      const userJson = urlParams.get('user');
      if (!userJson) {
        throw new UnauthorizedException('Invalid initData: missing user payload');
      }

      const userData: TelegramUserData = JSON.parse(userJson);
      return userData;
    } catch (err) {
      if (err instanceof UnauthorizedException || err instanceof ForbiddenException) {
        throw err;
      }
      throw new UnauthorizedException('Failed to validate Telegram initData: ' + (err as Error).message);
    }
  }

  /**
   * Main login flow: validate initData, check allowlist in DB, issue JWT.
   */
  public async authenticate(initData: string): Promise<AuthResponse> {
    const telegramUser = this.validateTelegramInitData(initData);
    const telegramIdBigInt = BigInt(telegramUser.id);

    const user = await this.prisma.user.findUnique({
      where: { telegramId: telegramIdBigInt },
    });

    if (!user || !user.isActive) {
      throw new ForbiddenException('Access Denied: Telegram ID is not in allowlist');
    }

    // Preserve custom database user details, only fill from Telegram if null
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        telegramUsername: user.telegramUsername ?? telegramUser.username ?? null,
        firstName: user.firstName ?? telegramUser.first_name ?? null,
        lastName: user.lastName ?? telegramUser.last_name ?? null,
      },
    });

    const payload = {
      sub: updatedUser.id,
      telegramId: updatedUser.telegramId.toString(),
      role: updatedUser.role,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: updatedUser.id,
        telegramId: updatedUser.telegramId.toString(),
        telegramUsername: updatedUser.telegramUsername,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role as unknown as Role,
        isActive: updatedUser.isActive,
      },
    };
  }
}
