import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FilamentsService } from './filaments.service';
import { CreateFilamentDto, UpdateFilamentDto, FilamentQueryDto } from '@printerp/shared';

@Controller('filaments')
@UseGuards(JwtAuthGuard)
export class FilamentsController {
  constructor(private readonly filamentsService: FilamentsService) {}

  @Get()
  async findAll(@Query() query: FilamentQueryDto) {
    return this.filamentsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.filamentsService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateFilamentDto) {
    return this.filamentsService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateFilamentDto) {
    return this.filamentsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.filamentsService.remove(id);
  }
}
