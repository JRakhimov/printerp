import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FilamentsService } from './filaments.service';
import {
  CreateFilamentDto,
  CreateFilamentSchema,
  UpdateFilamentDto,
  UpdateFilamentSchema,
  FilamentQueryDto,
  FilamentQuerySchema,
} from '@printerp/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('filaments')
@UseGuards(JwtAuthGuard)
export class FilamentsController {
  constructor(private readonly filamentsService: FilamentsService) {}

  @Get()
  async findAll(@Query(new ZodValidationPipe(FilamentQuerySchema)) query: FilamentQueryDto) {
    return this.filamentsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.filamentsService.findOne(id);
  }

  @Post()
  async create(@Body(new ZodValidationPipe(CreateFilamentSchema)) dto: CreateFilamentDto) {
    return this.filamentsService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(UpdateFilamentSchema)) dto: UpdateFilamentDto,
  ) {
    return this.filamentsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.filamentsService.remove(id);
  }
}
