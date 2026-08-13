import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateFinancialSettingsDto } from '@printerp/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('financial')
  async getFinancialSettings() {
    return this.settingsService.getFinancialSettings();
  }

  @Patch('financial')
  async updateFinancialSettings(@Body() dto: UpdateFinancialSettingsDto) {
    return this.settingsService.updateFinancialSettings(dto);
  }
}
