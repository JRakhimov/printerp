import { Test, TestingModule } from '@nestjs/testing';
import { SettingsService } from '../src/modules/settings/settings.service';
import { PrismaService } from '../src/database/prisma.service';

describe('SettingsService', () => {
  let service: SettingsService;

  const mockPrismaService = {
    systemSetting: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SettingsService>(SettingsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return default settings if none saved', async () => {
    mockPrismaService.systemSetting.findMany.mockResolvedValue([]);

    const result = await service.getFinancialSettings();

    expect(result.defaultMarkupPercentage).toBe(150);
    expect(result.electricityCostPerKwh).toBe(1000);
    expect(result.hourlyLaborRate).toBe(25000);
  });

  it('should update financial settings', async () => {
    const dto = {
      defaultMarkupPercentage: 160,
      electricityCostPerKwh: 1200,
      hourlyLaborRate: 30000,
    };

    mockPrismaService.systemSetting.upsert.mockResolvedValue({ key: 'a', value: 'b' });
    mockPrismaService.systemSetting.findMany.mockResolvedValue([
      { key: 'defaultMarkupPercentage', value: '160' },
      { key: 'electricityCostPerKwh', value: '1200' },
      { key: 'hourlyLaborRate', value: '30000' },
    ]);

    const result = await service.updateFinancialSettings(dto);

    expect(mockPrismaService.systemSetting.upsert).toHaveBeenCalledTimes(3);
    expect(result.defaultMarkupPercentage).toBe(160);
    expect(result.electricityCostPerKwh).toBe(1200);
  });
});
