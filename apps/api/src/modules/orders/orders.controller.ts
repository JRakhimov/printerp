import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  CreateOrderSchema,
  UpdateOrderDto,
  UpdateOrderSchema,
  ChangeOrderStatusDto,
  ChangeOrderStatusSchema,
  OrderQueryDto,
  OrderQuerySchema,
} from '@printerp/shared';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(
    @CurrentUser() user: any,
    @Body(new ZodValidationPipe(CreateOrderSchema)) createOrderDto: CreateOrderDto,
  ) {
    return this.ordersService.create(user.id, createOrderDto);
  }

  @Get()
  findAll(@Query(new ZodValidationPipe(OrderQuerySchema)) query: OrderQueryDto) {
    return this.ordersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.ordersService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: any,
    @Body(new ZodValidationPipe(ChangeOrderStatusSchema)) changeStatusDto: ChangeOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(id, user.id, changeStatusDto);
  }

  @Patch(':id')
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUser() user: any,
    @Body(new ZodValidationPipe(UpdateOrderSchema)) updateOrderDto: UpdateOrderDto,
  ) {
    return this.ordersService.update(id, user.id, updateOrderDto);
  }

  @Delete(':id')
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.ordersService.remove(id);
  }
}
