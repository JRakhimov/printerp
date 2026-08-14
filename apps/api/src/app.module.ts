import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ClientsModule } from './modules/clients/clients.module';
import { FilamentsModule } from './modules/filaments/filaments.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { OrdersModule } from './modules/orders/orders.module';
import { FinanceModule } from './modules/finance/finance.module';
import { SettingsModule } from './modules/settings/settings.module';
import { TelegramBotModule } from './modules/telegram-bot/telegram-bot.module';
import { PrintersModule } from './modules/printers/printers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    FilamentsModule,
    ProjectsModule,
    OrdersModule,
    FinanceModule,
    SettingsModule,
    TelegramBotModule,
    PrintersModule,
  ],
})
export class AppModule {}
