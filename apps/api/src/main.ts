import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 3000;

  // Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Configure CORS for Telegram Mini App frontend
  const allowedOriginsEnv = configService.get<string>('ALLOWED_ORIGINS') || '*';
  const allowedOrigins = allowedOriginsEnv === '*' ? '*' : allowedOriginsEnv.split(',').map((s) => s.trim());

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type,Accept,Authorization',
  });

  await app.listen(port, '0.0.0.0');
  console.log(`🚀 3D Print ERP API is listening on port ${port}`);
}

bootstrap();
