import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateProjectDto, UpdateProjectDto, ProjectQueryDto } from '@printerp/shared';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper algorithm: Calculate total material cost & total weight for a project
   */
  public async calculateProjectMetrics(filamentsInput: { filamentId: string; grams: number }[], extraCost: number = 0) {
    if (!filamentsInput || filamentsInput.length === 0) {
      return { totalWeight: 0, materialCost: 0, totalCost: extraCost };
    }

    const filamentIds = filamentsInput.map((f) => f.filamentId);
    const filaments = await this.prisma.filament.findMany({
      where: { id: { in: filamentIds }, deletedAt: null },
    });

    if (filaments.length !== filamentIds.length) {
      throw new BadRequestException('One or more selected filaments do not exist or were deleted');
    }

    const filamentMap = new Map(filaments.map((f) => [f.id, f]));

    let totalWeight = 0;
    let materialCostExact = 0;

    for (const item of filamentsInput) {
      const fil = filamentMap.get(item.filamentId);
      if (!fil) continue;

      totalWeight += item.grams;
      const costPerGram = Number(fil.costPerGram);
      materialCostExact += item.grams * costPerGram;
    }

    const materialCostInt = Math.round(materialCostExact);
    const totalCostInt = materialCostInt + extraCost;

    return {
      totalWeight,
      materialCost: materialCostInt,
      totalCost: totalCostInt,
    };
  }

  async findAll(query: ProjectQueryDto) {
    const { search } = query;

    return this.prisma.project.findMany({
      where: {
        deletedAt: null,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: {
        projectFilaments: {
          include: {
            filament: {
              select: {
                id: true,
                brand: true,
                name: true,
                material: true,
                color: true,
                costPerGram: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        projectFilaments: {
          include: {
            filament: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  async create(dto: CreateProjectDto) {
    const extraCost = dto.extraCost || 0;
    const { totalWeight, totalCost } = await this.calculateProjectMetrics(dto.filaments, extraCost);

    const defaultCost = dto.defaultCost !== undefined ? dto.defaultCost : totalCost;

    return this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        modelUrl: dto.modelUrl,
        imageUrl: dto.imageUrl,
        sizeXMm: dto.sizeXMm,
        sizeYMm: dto.sizeYMm,
        sizeZMm: dto.sizeZMm,
        printTimeMinutes: dto.printTimeMinutes,
        defaultPrice: dto.defaultPrice,
        defaultCost,
        weightG: totalWeight,
        extraCost,
        notes: dto.notes,
        projectFilaments: {
          create: dto.filaments.map((f) => ({
            filamentId: f.filamentId,
            grams: f.grams,
          })),
        },
      },
      include: {
        projectFilaments: {
          include: {
            filament: true,
          },
        },
      },
    });
  }

  async update(id: string, dto: UpdateProjectDto) {
    const existing = await this.findOne(id);

    const extraCost = dto.extraCost !== undefined ? dto.extraCost : existing.extraCost;

    let totalWeight = existing.weightG;
    let calculatedTotalCost = existing.defaultCost;

    if (dto.filaments !== undefined) {
      const metrics = await this.calculateProjectMetrics(dto.filaments, extraCost);
      totalWeight = metrics.totalWeight;
      calculatedTotalCost = metrics.totalCost;
    }

    const defaultCost = dto.defaultCost !== undefined ? dto.defaultCost : calculatedTotalCost;

    // Use transaction to update project and filaments atomic
    return this.prisma.$transaction(async (tx) => {
      if (dto.filaments !== undefined) {
        await tx.projectFilament.deleteMany({
          where: { projectId: id },
        });

        await tx.projectFilament.createMany({
          data: dto.filaments.map((f) => ({
            projectId: id,
            filamentId: f.filamentId,
            grams: f.grams,
          })),
        });
      }

      return tx.project.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          modelUrl: dto.modelUrl,
          imageUrl: dto.imageUrl,
          sizeXMm: dto.sizeXMm,
          sizeYMm: dto.sizeYMm,
          sizeZMm: dto.sizeZMm,
          printTimeMinutes: dto.printTimeMinutes,
          defaultPrice: dto.defaultPrice,
          defaultCost,
          weightG: totalWeight,
          extraCost,
          notes: dto.notes,
        },
        include: {
          projectFilaments: {
            include: {
              filament: true,
            },
          },
        },
      });
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
