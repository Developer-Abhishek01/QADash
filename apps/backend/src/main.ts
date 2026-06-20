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
import * as express from 'express';

async function bootstrap() {
  initConfig();
  const isProduction = process.env.NODE_ENV === 'production';
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const expressApp = app.getHttpAdapter().getInstance();

  // Force lazy-router to init so _router.stack exists
  expressApp.use((_req: any, _res: any, next: any) => next());

  if (expressApp._router?.stack) {
    const router = express.Router();
    const jsonMw = express.json({ limit: '500mb' });
    const urlMw = express.urlencoded({ limit: '500mb', extended: true });
    router.use(jsonMw);
    router.use(urlMw);

    // Remove default 100kb body parsers and inject 500mb parsers at the front
    const stack = expressApp._router.stack;
    for (let i = stack.length - 1; i >= 0; i--) {
      const name = stack[i]?.name || '';
      if (name === 'jsonParser' || name === 'urlencodedParser') {
        stack.splice(i, 1);
      }
    }

    // Insert high-limit parsers at the front (before all routes)
    stack.unshift(...router.stack);
  }

  app.use(helmet({
    crossOriginResourcePolicy: false,
  }));

  // Serve static files from uploads directory
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));
  
  app.enableCors({
    origin: isProduction ? process.env.CORS_ORIGIN || 'http://localhost:3000' : true,
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