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
import { FinanceService } from './finance.service';
import { CreateTransactionDto, TransactionQueryDto } from '@printerp/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Post('transactions')
  async createTransaction(
    @Body() dto: CreateTransactionDto,
    @CurrentUser('id') userId?: string,
  ) {
    return this.financeService.createTransaction(dto, userId);
  }

  @Get('transactions')
  async findAllTransactions(@Query() query: TransactionQueryDto) {
    return this.financeService.findAllTransactions(query);
  }

  @Delete('transactions/:id')
  async deleteTransaction(@Param('id') id: string) {
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

  @Get('top-clients')
  async getTopClients() {
    return this.financeService.getTopClients();
  }
}
