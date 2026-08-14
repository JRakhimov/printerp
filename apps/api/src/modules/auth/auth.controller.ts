import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { TelegramAuthService } from './telegram-auth.service';
import { TelegramAuthDto } from '@printerp/shared';

@Controller('auth')
export class AuthController {
  constructor(private readonly telegramAuthService: TelegramAuthService) {}

  @Post('telegram')
  @HttpCode(HttpStatus.OK)
  async authenticateTelegram(@Body() body: TelegramAuthDto) {
    return this.telegramAuthService.authenticate(body.initData);
  }
}
