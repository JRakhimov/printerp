import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private pingInterval: NodeJS.Timeout | null = null;

  async onModuleInit() {
    await this.$connect();

    // Periodic DB heartbeat ping every 5 minutes to prevent TCP socket drops and cold starts
    this.pingInterval = setInterval(async () => {
      try {
        await this.$queryRaw`SELECT 1`;
      } catch (err) {
        // Silently catch ping errors, connection pool will automatically reconnect on next request
      }
    }, 5 * 60 * 1000);
  }

  async onModuleDestroy() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    await this.$disconnect();
  }
}
