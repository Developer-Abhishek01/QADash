import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as dotenv from 'dotenv';
import { join } from 'path';

// Load environment variables early
dotenv.config();

import { AppModule } from './app.module';
import { logger } from '@qadash/logger';
import { initConfig } from '@qadash/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import helmet from 'helmet';
import * as bodyParser from 'body-parser';
import * as express from 'express';

async function bootstrap() {
  initConfig();
  const isProduction = process.env.NODE_ENV === 'production';
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // Forcefully replace default body-parsers (100kb limit) with high-limit ones
  const expressApp = app.getHttpAdapter().getInstance();
  const layers = expressApp._router?.stack;
  if (layers) {
    for (let i = layers.length - 1; i >= 0; i--) {
      const name = layers[i]?.name?.toLowerCase() || '';
      if (name === 'jsonparser' || name === 'urlencodedparser') {
        layers.splice(i, 1);
      }
    }
    // Insert custom parsers at the front (before routes)
    const router = require('express').Router();
    router.use(require('body-parser').json({ limit: '500mb' }));
    router.use(require('body-parser').urlencoded({ limit: '500mb', extended: true }));
    layers.unshift(...router.stack);
  }

  app.use(helmet({
    crossOriginResourcePolicy: false,
  }));

  // Serve static files from uploads directory
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));
  
  app.enableCors({
    origin: true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With', 
      'Accept',
      'Origin',
      'Access-Control-Allow-Origin'
    ],
    exposedHeaders: ['Set-Cookie'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    })
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const config = new DocumentBuilder()
    .setTitle('QA Dashboard API')
    .setDescription('Enterprise QA Dashboard Backend API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('projects', 'Project management')
    .addTag('tests', 'Test management')
    .addTag('executions', 'Test execution')
    .addTag('reports', 'Report generation')
    .addTag('bugs', 'Bug tracking')
    .addTag('health', 'Health checks')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');

  logger.info(`🚀 QA Dashboard API running on: http://127.0.0.1:${port}`);
  logger.info(`📚 Swagger docs available at: http://127.0.0.1:${port}/api/docs`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap();