import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ScrapService } from './scrap.service';
import {
  CreateScrapRecordDto,
  CreateScrapRecordSchema,
  ScrapQueryDto,
  ScrapQuerySchema,
} from '@printerp/shared';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('scrap')
@UseGuards(JwtAuthGuard)
export class ScrapController {
  constructor(private readonly scrapService: ScrapService) {}

  @Post()
  async create(
    @CurrentUser('id') userId: string | undefined,
    @Body(new ZodValidationPipe(CreateScrapRecordSchema)) dto: CreateScrapRecordDto,
  ) {
    return this.scrapService.create(userId, dto);
  }

  @Get()
  async findAll(@Query(new ZodValidationPipe(ScrapQuerySchema)) query: ScrapQueryDto) {
    return this.scrapService.findAll(query);
  }

  @Get('summary')
  async getSummary() {
    return this.scrapService.getSummary();
  }

  @Delete(':id')
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.scrapService.remove(id);
  }
}
