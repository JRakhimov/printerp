import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  UpdateFinancialSettingsDto,
  FinancialSettingsResponse,
} from '@printerp/shared';

const DEFAULT_MARKUP_PERCENTAGE = '150';
const DEFAULT_ELECTRICITY_COST_PER_KWH = '1000';
const DEFAULT_HOURLY_LABOR_RATE = '25000';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getFinancialSettings(): Promise<FinancialSettingsResponse> {
    const settings = await this.prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            'defaultMarkupPercentage',
            'electricityCostPerKwh',
            'hourlyLaborRate',
          ],
        },
      },
    });

    const settingsMap = new Map(settings.map((s) => [s.key, s.value]));

    const defaultMarkupPercentage = Number(
      settingsMap.get('defaultMarkupPercentage') ?? DEFAULT_MARKUP_PERCENTAGE,
    );
    const electricityCostPerKwh = Number(
      settingsMap.get('electricityCostPerKwh') ?? DEFAULT_ELECTRICITY_COST_PER_KWH,
    );
    const hourlyLaborRate = Number(
      settingsMap.get('hourlyLaborRate') ?? DEFAULT_HOURLY_LABOR_RATE,
    );

    return {
      defaultMarkupPercentage,
      electricityCostPerKwh,
      hourlyLaborRate,
    };
  }

  async updateFinancialSettings(
    dto: UpdateFinancialSettingsDto,
  ): Promise<FinancialSettingsResponse> {
    const entries = [
      { key: 'defaultMarkupPercentage', value: dto.defaultMarkupPercentage.toString() },
      { key: 'electricityCostPerKwh', value: dto.electricityCostPerKwh.toString() },
      { key: 'hourlyLaborRate', value: dto.hourlyLaborRate.toString() },
    ];

    for (const entry of entries) {
      await this.prisma.systemSetting.upsert({
        where: { key: entry.key },
        update: { value: entry.value },
        create: { key: entry.key, value: entry.value },
      });
    }

    return this.getFinancialSettings();
  }
}
