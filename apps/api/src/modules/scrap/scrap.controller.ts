import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
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

@Controller('scrap')
@UseGuards(JwtAuthGuard)
export class ScrapController {
  constructor(private readonly scrapService: ScrapService) {}

  @Post()
  async create(@CurrentUser('id') userId: string | undefined, @Body() body: unknown) {
    const dto: CreateScrapRecordDto = CreateScrapRecordSchema.parse(body);
    return this.scrapService.create(userId, dto);
  }

  @Get()
  async findAll(@Query() query: unknown) {
    const parsedQuery: ScrapQueryDto = ScrapQuerySchema.parse(query);
    return this.scrapService.findAll(parsedQuery);
  }

  @Get('summary')
  async getSummary() {
    return this.scrapService.getSummary();
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.scrapService.remove(id);
  }
}
