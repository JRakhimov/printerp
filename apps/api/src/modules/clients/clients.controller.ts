import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ClientsService } from './clients.service';
import {
  CreateClientDto,
  CreateClientSchema,
  UpdateClientDto,
  UpdateClientSchema,
  ClientQueryDto,
  ClientQuerySchema,
} from '@printerp/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('clients')
@UseGuards(JwtAuthGuard)
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Get()
  async findAll(@Query(new ZodValidationPipe(ClientQuerySchema)) query: ClientQueryDto) {
    return this.clientsService.findAll(query);
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.clientsService.findOne(id);
  }

  @Post()
  async create(@Body(new ZodValidationPipe(CreateClientSchema)) dto: CreateClientDto) {
    return this.clientsService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(UpdateClientSchema)) dto: UpdateClientDto,
  ) {
    return this.clientsService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.clientsService.remove(id);
  }
}
