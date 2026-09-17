import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { TelegramAuthService } from './telegram-auth.service';
import { TelegramAuthDto, TelegramAuthSchema } from '@printerp/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('auth')
export class AuthController {
  constructor(private readonly telegramAuthService: TelegramAuthService) {}

  @Post('telegram')
  @HttpCode(HttpStatus.OK)
  async authenticateTelegram(
    @Body(new ZodValidationPipe(TelegramAuthSchema)) body: TelegramAuthDto,
  ) {
    return this.telegramAuthService.authenticate(body.initData);
  }
}
