import { Module } from '@nestjs/common';
import { ScrapController } from './scrap.controller';
import { ScrapService } from './scrap.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ScrapController],
  providers: [ScrapService],
  exports: [ScrapService],
})
export class ScrapModule {}
