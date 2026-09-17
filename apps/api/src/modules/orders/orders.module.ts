import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { TelegramBotModule } from '../telegram-bot/telegram-bot.module';
import { OrderInventoryService } from './order-inventory.service';

@Module({
  imports: [TelegramBotModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderInventoryService],
  exports: [OrdersService],
})
export class OrdersModule {}
