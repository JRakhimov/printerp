import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PrintersService } from './printers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  CreatePrinterSchema,
  CreatePrinterDto,
  UpdatePrinterSchema,
  UpdatePrinterDto,
  TestConnectionSchema,
  TestConnectionDto,
  CreatePrintJobSchema,
  CreatePrintJobDto,
  UpdatePrintJobStatusSchema,
  UpdatePrintJobStatusDto,
} from '@printerp/shared';

@Controller('printers')
@UseGuards(JwtAuthGuard)
export class PrintersController {
  constructor(private readonly printersService: PrintersService) {}

  @Get()
  async findAll() {
    return this.printersService.findAll();
  }

  @Post('test')
  async testConnection(@Body() body: unknown) {
    const dto: TestConnectionDto = TestConnectionSchema.parse(body);
    return this.printersService.testConnection(dto);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.printersService.findOne(id);
  }

  @Post()
  async create(@Body() body: unknown) {
    const dto: CreatePrinterDto = CreatePrinterSchema.parse(body);
    return this.printersService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: unknown) {
    const dto: UpdatePrinterDto = UpdatePrinterSchema.parse(body);
    return this.printersService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.printersService.remove(id);
  }

  @Post(':id/jobs')
  async createPrintJob(@Param('id') printerId: string, @Body() body: unknown) {
    const dto: CreatePrintJobDto = CreatePrintJobSchema.parse(body);
    return this.printersService.createPrintJob(printerId, dto);
  }

  @Patch('jobs/:jobId/status')
  async updatePrintJobStatus(
    @Param('jobId') jobId: string,
    @Body() body: unknown,
  ) {
    const dto: UpdatePrintJobStatusDto = UpdatePrintJobStatusSchema.parse(body);
    return this.printersService.updatePrintJobStatus(jobId, dto.status);
  }
}
