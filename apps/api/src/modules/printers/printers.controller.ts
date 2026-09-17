import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Res,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Response } from 'express';
import { PrintersService } from './printers.service';
import { PrinterCameraService } from './printer-camera.service';
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
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('printers')
@UseGuards(JwtAuthGuard)
export class PrintersController {
  constructor(
    private readonly printersService: PrintersService,
    private readonly printerCameraService: PrinterCameraService,
  ) {}

  @Get()
  async findAll() {
    return this.printersService.findAll();
  }

  @Post('test')
  async testConnection(
    @Body(new ZodValidationPipe(TestConnectionSchema)) dto: TestConnectionDto,
  ) {
    return this.printersService.testConnection(dto);
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.printersService.findOne(id);
  }

  @Post()
  async create(@Body(new ZodValidationPipe(CreatePrinterSchema)) dto: CreatePrinterDto) {
    return this.printersService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(UpdatePrinterSchema)) dto: UpdatePrinterDto,
  ) {
    return this.printersService.update(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.printersService.remove(id);
  }

  @Post(':id/jobs')
  async createPrintJob(
    @Param('id', new ParseUUIDPipe()) printerId: string,
    @Body(new ZodValidationPipe(CreatePrintJobSchema)) dto: CreatePrintJobDto,
  ) {
    return this.printersService.createPrintJob(printerId, dto);
  }

  @Patch('jobs/:jobId/status')
  async updatePrintJobStatus(
    @Param('jobId', new ParseUUIDPipe()) jobId: string,
    @Body(new ZodValidationPipe(UpdatePrintJobStatusSchema)) dto: UpdatePrintJobStatusDto,
  ) {
    return this.printersService.updatePrintJobStatus(jobId, dto.status);
  }

  @Get(':id/camera/stream')
  async streamCamera(@Param('id', new ParseUUIDPipe()) id: string, @Res() res: Response) {
    return this.printerCameraService.streamCamera(id, res);
  }

  @Get(':id/camera/snapshot')
  async getSnapshot(@Param('id', new ParseUUIDPipe()) id: string, @Res() res: Response) {
    const buffer = await this.printerCameraService.getSnapshot(id);
    res.set({
      'Content-Type': 'image/jpeg',
      'Content-Length': buffer.length.toString(),
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
    });
    res.end(buffer);
  }

  @Get(':id/camera/status')
  async getCameraStatus(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.printerCameraService.getCameraStatus(id);
  }
}
