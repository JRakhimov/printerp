import { Module } from '@nestjs/common';
import { PrintersService } from './printers.service';
import { PrintersController } from './printers.controller';
import { BambuMqttService } from './bambu-mqtt.service';
import { AnycubicMqttService } from './anycubic-mqtt.service';
import { TelegramBotModule } from '../telegram-bot/telegram-bot.module';

@Module({
  imports: [TelegramBotModule],
  controllers: [PrintersController],
  providers: [PrintersService, BambuMqttService, AnycubicMqttService],
  exports: [PrintersService, BambuMqttService, AnycubicMqttService],
})
export class PrintersModule {}
