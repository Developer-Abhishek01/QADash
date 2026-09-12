import { createReadStream, stat } from 'fs';
import { extname, resolve, sep } from 'path';

import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { initConfig } from '@qadash/config';
import { logger } from '@qadash/logger';
import compression from 'compression';
import * as dotenv from 'dotenv';
import * as express from 'express';
import helmet from 'helmet';

// Load environment variables early
dotenv.config();

import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { OrchestrationService } from './modules/orchestration/orchestration.service';

async function bootstrap() {
  initConfig();
  const isProduction = process.env.NODE_ENV === 'production';
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  const expressApp = app.getHttpAdapter().getInstance();

  // Force lazy-router to init so _router.stack exists
  expressApp.use((_req: express.Request, _res: express.Response, next: express.NextFunction) => next());

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

  app.use(compression());

  const uploadsDir = resolve(process.cwd(), 'uploads');
  const jwtService = app.get(JwtService);

  const CONTENT_TYPES: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.bmp': 'image/bmp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.yaml': 'application/yaml',
    '.yml': 'application/yaml',
    '.txt': 'text/plain',
    '.log': 'text/plain',
    '.zip': 'application/zip',
  };

  const sendUploadError = (res: express.Response, statusCode: number, message: string) => {
    res.status(statusCode).json({
      success: false,
      statusCode,
      message,
      timestamp: new Date().toISOString(),
    });
  };

  // Serve files from /uploads only after JWT verification.
  // Media tags (<img>/<video>) cannot set headers, so the token is also accepted
  // via the `?token=` query parameter.
  app.use('/uploads', (req: express.Request, res: express.Response) => {
    // 1. Authenticate (reuse the app's JWT service — same secret & algorithms as API routes)
    let token: string | undefined;
    const authHeader = req.headers.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (typeof req.query.token === 'string' && req.query.token) {
      token = req.query.token;
    }
    if (!token) return sendUploadError(res, 401, 'Unauthorized');
    try {
      jwtService.verify(token);
    } catch {
      return sendUploadError(res, 401, 'Unauthorized');
    }

    // 2. Path traversal protection (covers %2e%2e and double-encoded %252e%252e variants)
    let relPath: string;
    try {
      relPath = decodeURIComponent(req.path);
    } catch {
      return sendUploadError(res, 400, 'Bad request');
    }
    let doubleDecoded = relPath;
    try {
      doubleDecoded = decodeURIComponent(relPath);
    } catch {
      // keep single-decoded value
    }
    const segments = doubleDecoded !== relPath ? doubleDecoded : relPath;
    if (relPath.includes('\\') || doubleDecoded.includes('\\') || segments.split('/').includes('..')) {
      return sendUploadError(res, 403, 'Forbidden');
    }

    const filePath = resolve(uploadsDir, `.${relPath}`);
    if (filePath !== uploadsDir && !filePath.startsWith(uploadsDir + sep)) {
      return sendUploadError(res, 403, 'Forbidden');
    }

    // 3. Serve the file
    stat(filePath, (err, stats) => {
      if (err || !stats.isFile()) return sendUploadError(res, 404, 'File not found');
      const ext = extname(filePath).toLowerCase();
      res.status(200);
      res.setHeader('Content-Type', CONTENT_TYPES[ext] || 'application/octet-stream');
      res.setHeader('Content-Length', stats.size);
      res.setHeader('Cache-Control', 'private, max-age=300');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      const stream = createReadStream(filePath);
      stream.on('error', () => {
        if (!res.headersSent) {
          sendUploadError(res, 404, 'File not found');
        } else {
          res.destroy();
        }
      });
      stream.pipe(res);
    });
  });
  
  app.enableShutdownHooks();

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

  const preferredPort = parseInt(process.env.PORT || '3001', 10);
  const maxPortAttempts = 10;
  let port = preferredPort;

  for (let attempt = 0; attempt < maxPortAttempts; attempt++) {
    try {
      await new Promise<void>((resolve, reject) => {
        const server = app.getHttpServer();
        server.once('error', (err: Error) => {
          reject(err);
        });
        app.listen(port, '0.0.0.0').then(() => resolve()).catch(reject);
      });
      break;
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'EADDRINUSE' && attempt < maxPortAttempts - 1) {
        logger.warn(`Port ${port} in use, trying ${port + 1}`);
        port++;
      } else {
        throw err;
      }
    }
  }

  logger.info(`🚀 QA Dashboard API running on: http://127.0.0.1:${port}`);
  logger.info(`📚 Swagger docs available at: http://127.0.0.1:${port}/api/docs`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);

  app.get(OrchestrationService).registerSelf(port);
}

// Log unhandled errors instead of killing the whole API
process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Rejection: ${reason instanceof Error ? reason.message : String(reason)}`);
});
process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`, err.stack);
});

bootstrap().catch((err) => {
  logger.error(`Bootstrap failed: ${err instanceof Error ? err.message : String(err)}`, err instanceof Error ? err.stack : undefined);
  process.exit(1);
});