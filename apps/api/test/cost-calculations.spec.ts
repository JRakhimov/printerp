import { Test, TestingModule } from '@nestjs/testing';
import { FilamentsService } from '../src/modules/filaments/filaments.service';
import { ProjectsService } from '../src/modules/projects/projects.service';
import { PrismaService } from '../src/database/prisma.service';
import { Prisma } from '@prisma/client';

describe('Phase 2 Cost & Price Calculations', () => {
  let filamentsService: FilamentsService;
  let projectsService: ProjectsService;
  let prismaService: any;

  beforeEach(async () => {
    prismaService = {
      filament: {
        findMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FilamentsService,
        ProjectsService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    filamentsService = module.get<FilamentsService>(FilamentsService);
    projectsService = module.get<ProjectsService>(ProjectsService);
  });

  describe('Filament costPerGram calculation', () => {
    it('should correctly calculate costPerGram = pricePerSpool / spoolWeightG', () => {
      const cost1 = filamentsService.calculateCostPerGram(2200, 1000);
      expect(cost1.toString()).toBe('2.2');

      const cost2 = filamentsService.calculateCostPerGram(1800, 1000);
      expect(cost2.toString()).toBe('1.8');

      const cost3 = filamentsService.calculateCostPerGram(2500, 750);
      expect(cost3.toString()).toBe('3.3333');
    });
  });

  describe('Project materialCost and totalCost calculations', () => {
    it('should correctly calculate project metrics for single filament and extraCost', async () => {
      prismaService.filament.findMany.mockResolvedValue([
        {
          id: 'fil-1',
          costPerGram: new Prisma.Decimal(2.2),
        },
      ]);

      const metrics = await projectsService.calculateProjectMetrics(
        [{ filamentId: 'fil-1', grams: 144 }],
        200, // extraCost
      );

      // 144g * 2.2 = 316.8 -> rounded to 317 materialCost
      // totalCost = 317 + 200 = 517
      expect(metrics.totalWeight).toBe(144);
      expect(metrics.materialCost).toBe(317);
      expect(metrics.totalCost).toBe(517);
    });

    it('should correctly calculate project metrics for multi-filament project (Dragon example)', async () => {
      // Dragon example: PLA Black 122g @ 2.2/g, PLA White 18g @ 2.2/g, PLA Red 4g @ 2.5/g
      prismaService.filament.findMany.mockResolvedValue([
        { id: 'pla-black', costPerGram: new Prisma.Decimal(2.2) },
        { id: 'pla-white', costPerGram: new Prisma.Decimal(2.2) },
        { id: 'pla-red', costPerGram: new Prisma.Decimal(2.5) },
      ]);

      const metrics = await projectsService.calculateProjectMetrics(
        [
          { filamentId: 'pla-black', grams: 122 },
          { filamentId: 'pla-white', grams: 18 },
          { filamentId: 'pla-red', grams: 4 },
        ],
        50, // extraCost
      );

      // totalWeight = 122 + 18 + 4 = 144g
      // materialCostExact = (122 * 2.2) + (18 * 2.2) + (4 * 2.5) = 268.4 + 39.6 + 10 = 318
      // totalCost = 318 + 50 = 368
      expect(metrics.totalWeight).toBe(144);
      expect(metrics.materialCost).toBe(318);
      expect(metrics.totalCost).toBe(368);
    });
  });
});
