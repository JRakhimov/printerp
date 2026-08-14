import { Module } from '@nestjs/common';
import { PrintersService } from './printers.service';
import { PrintersController } from './printers.controller';
import { BambuMqttService } from './bambu-mqtt.service';

@Module({
  controllers: [PrintersController],
  providers: [PrintersService, BambuMqttService],
  exports: [PrintersService, BambuMqttService],
})
export class PrintersModule {}
