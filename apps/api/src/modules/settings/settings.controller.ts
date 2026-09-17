import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateFinancialSettingsDto, UpdateFinancialSettingsSchema } from '@printerp/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('financial')
  async getFinancialSettings() {
    return this.settingsService.getFinancialSettings();
  }

  @Patch('financial')
  async updateFinancialSettings(
    @Body(new ZodValidationPipe(UpdateFinancialSettingsSchema)) dto: UpdateFinancialSettingsDto,
  ) {
    return this.settingsService.updateFinancialSettings(dto);
  }
}
