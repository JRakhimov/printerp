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
import { FinanceService } from './finance.service';
import {
  CreateTransactionDto,
  CreateTransactionSchema,
  TransactionQueryDto,
  TransactionQuerySchema,
} from '@printerp/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post('transactions')
  async createTransaction(
    @Body(new ZodValidationPipe(CreateTransactionSchema)) dto: CreateTransactionDto,
    @CurrentUser('id') userId?: string,
  ) {
    return this.financeService.createTransaction(dto, userId);
  }

  @Get('transactions')
  async findAllTransactions(
    @Query(new ZodValidationPipe(TransactionQuerySchema)) query: TransactionQueryDto,
  ) {
    return this.financeService.findAllTransactions(query);
  }

  @Delete('transactions/:id')
  async deleteTransaction(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.financeService.deleteTransaction(id);
  }

  @Get('summary')
  async getSummary() {
    return this.financeService.getSummary();
  }

  @Get('monthly')
  async getMonthlyAnalytics() {
    return this.financeService.getMonthlyAnalytics();
  }

  @Get('top-models')
  async getTopModels() {
    return this.financeService.getTopModels();
  }

  @Get('top-scrap-models')
  async getTopScrapModels() {
    return this.financeService.getTopScrapModels();
  }

  @Get('top-clients')
  async getTopClients() {
    return this.financeService.getTopClients();
  }
}
