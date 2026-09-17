import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProjectsService } from './projects.service';
import {
  CreateProjectDto,
  CreateProjectSchema,
  UpdateProjectDto,
  UpdateProjectSchema,
  ProjectQueryDto,
  ProjectQuerySchema,
} from '@printerp/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async findAll(@Query(new ZodValidationPipe(ProjectQuerySchema)) query: ProjectQueryDto) {
    return this.projectsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.projectsService.findOne(id);
  }

  @Post()
  async create(@Body(new ZodValidationPipe(CreateProjectSchema)) dto: CreateProjectDto) {
    return this.projectsService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(UpdateProjectSchema)) dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.projectsService.remove(id);
  }
}
