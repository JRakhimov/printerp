import { Module } from '@nestjs/common';
import { PrintersService } from './printers.service';
import { PrintersController } from './printers.controller';
import { BambuMqttService } from './bambu-mqtt.service';
import { AnycubicMqttService } from './anycubic-mqtt.service';
import { PrinterCameraService } from './printer-camera.service';
import { TelegramBotModule } from '../telegram-bot/telegram-bot.module';

@Module({
  imports: [TelegramBotModule],
  controllers: [PrintersController],
  providers: [PrintersService, BambuMqttService, AnycubicMqttService, PrinterCameraService],
  exports: [PrintersService, BambuMqttService, AnycubicMqttService, PrinterCameraService],
})
export class PrintersModule {}
