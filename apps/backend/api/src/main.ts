import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';

import type { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  const configService = app.get(ConfigService);

  app.use(cookieParser());

  app.enableCors({
    origin: 'http://localhost:4200',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1');
  app.setGlobalPrefix(apiPrefix);

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  console.log(`🚀 Application is running on: ${await app.getUrl()}/${apiPrefix}`);
}
bootstrap();
